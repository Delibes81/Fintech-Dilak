import type { Category, Kind, Tx } from "./types";
import { DICTIONARY, ROLE_KIND, ROLE_NAME, type Role } from "./dictionary";

export const normalize = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* ───────────────────────── Detección de categoría ───────────────────────── */

/** Pistas de que el movimiento es ahorro/inversión (si no, esa categoría no se sugiere). */
export const SAVING_HINT = /ahorr|invers|plazo|fci|cetes|afore|gbm|guardadito/i;

type Entry = { toks: string[]; cat: Category; strength: number };
type Index = { singles: Map<string, Entry[]>; phrases: Entry[]; prefixable: Entry[] };
type Vote = { cat: Category; strength: number };
type Learned = Map<string, Vote>;

/** Fuerza de cada evidencia: lo que configuraron ustedes pesa más que el diccionario. */
const W = { keyword: 3, keywordPrefix: 2.4, dict: 2, dictPrefix: 1.8, fuzzy: 1.5, phraseBonus: 0.75 };
/** Palabras que no dicen nada de la categoría (no se aprenden). */
const STOP = new Set([
  "de", "del", "la", "el", "los", "las", "en", "con", "para", "por", "un", "una", "uno", "y", "a", "al", "mi", "mis",
  "su", "sus", "tu", "que", "lo", "le", "se", "es", "pago", "pague", "compra", "compre", "gasto", "gaste", "cosas",
  "varios", "varias", "otro", "otra", "otros", "mas", "hoy", "ayer", "semana", "mes", "peso", "pesos", "dia",
]);

/** Variantes singular/plural de una palabra ("tortillas" ↔ "tortilla", "tamales" ↔ "tamal"). */
function forms(w: string) {
  const f = [w, w + "s", w + "es"];
  if (w.length > 3 && w.endsWith("s")) f.push(w.slice(0, -1));
  if (w.length > 4 && w.endsWith("es")) f.push(w.slice(0, -2));
  return f;
}
const sameWord = (a: string, b: string) => a === b || forms(a).includes(b);

/** ¿Difieren en una sola letra? (errores de tipeo: "soriaba" ≈ "soriana"). */
function oneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Categoría que corresponde a cada rol del diccionario (por ícono y, si no, por nombre). */
function roleCategory(role: Role, cats: Category[]) {
  const kind = ROLE_KIND[role];
  const pool = cats.filter((c) => c.kind === kind);
  return pool.find((c) => c.icon === role) ?? pool.find((c) => ROLE_NAME[role].test(normalize(c.name))) ?? null;
}

/** Firma de las categorías: quien llama suele pasar un arreglo filtrado nuevo en cada tecla. */
const signature = (cats: Category[]) => cats.map((c) => `${c.id}:${c.kind}:${c.icon}:${c.name}:${c.keywords.join(",")}`).join("|");
const indexCache = new Map<string, Index>();
function buildIndex(cats: Category[], sig: string): Index {
  const cached = indexCache.get(sig);
  if (cached) return cached;
  const singles = new Map<string, Entry[]>();
  const phrases: Entry[] = [];
  const prefixable: Entry[] = [];
  const add = (term: string, cat: Category, base: number) => {
    const toks = normalize(term).split(" ").filter(Boolean);
    if (!toks.length) return;
    const e: Entry = { toks, cat, strength: base + W.phraseBonus * (toks.length - 1) };
    if (toks.length > 1) { phrases.push(e); return; }
    const list = singles.get(toks[0]) ?? [];
    list.push(e);
    singles.set(toks[0], list);
    if (toks[0].length >= 4) prefixable.push(e);
  };
  for (const c of cats) for (const k of [...c.keywords, c.name]) add(k, c, W.keyword);
  for (const role of Object.keys(DICTIONARY) as Role[]) {
    const cat = roleCategory(role, cats);
    if (cat) for (const term of DICTIONARY[role]) add(term, cat, W.dict);
  }
  phrases.sort((a, b) => b.toks.length - a.toks.length || b.strength - a.strength);
  const index = { singles, phrases, prefixable };
  if (indexCache.size > 8) indexCache.clear();
  indexCache.set(sig, index);
  return index;
}

/**
 * Vota una categoría por palabra y gana la evidencia más fuerte.
 * Las frases más largas ganan sobre sus palabras sueltas ("oxxo gas" → Transporte, no Súper).
 * Devuelve además qué palabras quedaron explicadas, para aprender solo de las demás.
 */
function score(words: string[], index: Index, learned: Learned | null) {
  const votes: (Vote | null)[] = words.map(() => null);
  const claimed = words.map(() => false);
  for (const p of index.phrases) {
    for (let i = 0; i + p.toks.length <= words.length; i++) {
      if (claimed.slice(i, i + p.toks.length).some(Boolean)) continue;
      if (!p.toks.every((t, k) => sameWord(t, words[i + k]))) continue;
      for (let k = 0; k < p.toks.length; k++) { claimed[i + k] = true; votes[i + k] = { cat: p.cat, strength: p.strength }; }
    }
  }
  const offer = (i: number, cat: Category, strength: number) => {
    if (!votes[i] || strength > votes[i]!.strength) votes[i] = { cat, strength };
  };
  words.forEach((w, i) => {
    if (claimed[i] || STOP.has(w)) return;
    for (const f of forms(w)) for (const e of index.singles.get(f) ?? []) offer(i, e.cat, e.strength);
    if (w.length >= 4)
      for (const e of index.prefixable)
        if (w.startsWith(e.toks[0])) {
          // Palabras propias: cualquier derivado ("supermercadito"); diccionario: solo cercanos
          if (e.strength === W.keyword) offer(i, e.cat, W.keywordPrefix);
          else if (w.length - e.toks[0].length <= 4) offer(i, e.cat, W.dictPrefix);
        }
    if (!votes[i] && w.length >= 5)
      for (const [term, entries] of index.singles) if (term.length >= 5 && oneEdit(w, term)) offer(i, entries[0].cat, W.fuzzy);
    const l = learned?.get(w);
    if (l) offer(i, l.cat, l.strength);
  });
  // Gana la categoría con el voto más fuerte; a igualdad, la que suma más; después, la que se nombró primero.
  const totals = new Map<string, { cat: Category; max: number; sum: number; first: number }>();
  votes.forEach((v, i) => {
    if (!v) return;
    const t = totals.get(v.cat.id) ?? { cat: v.cat, max: 0, sum: 0, first: i };
    t.max = Math.max(t.max, v.strength);
    t.sum += v.strength;
    totals.set(v.cat.id, t);
  });
  const best = [...totals.values()].sort((a, b) => b.max - a.max || b.sum - a.sum || a.first - b.first)[0];
  return { cat: best?.cat ?? null, explained: votes.map(Boolean) };
}

const learnedCache = new WeakMap<Tx[], Map<string, Learned>>();
/**
 * Aprende por palabra de lo que ya cargaron:
 * - Si corrigieron la categoría (o el detalle no la sugería), cada palabra apunta a la elegida
 *   con fuerza alta: "Oxxo" en Comida afuera → la próxima "oxxo reforma" va a Comida afuera.
 * - Si el detalle ya la sugería, solo se aprenden las palabras sueltas, con fuerza baja:
 *   "Tacos don Pepe" → "don pepe" solo también va a Comida afuera.
 */
function learnWords(history: Tx[], cats: Category[], index: Index, sig: string): Learned {
  const cached = learnedCache.get(history)?.get(sig);
  if (cached) return cached;
  const byId = new Map(cats.map((c) => [c.id, c]));
  const tally = new Map<string, Map<string, { strong: number; weak: number }>>();
  for (const t of history) {
    if (t.recurring_id || t.goal_id || !t.category_id || !t.note || !byId.has(t.category_id)) continue;
    const words = normalize(t.note).split(" ");
    const { cat, explained } = score(words, index, null);
    const corrected = cat?.id !== t.category_id;
    words.forEach((w, i) => {
      if (w.length < 3 || STOP.has(w) || /^\d+$/.test(w) || (!corrected && explained[i])) return;
      const perCat = tally.get(w) ?? new Map();
      const n = perCat.get(t.category_id!) ?? { strong: 0, weak: 0 };
      if (corrected) n.strong++; else n.weak++;
      perCat.set(t.category_id!, n);
      tally.set(w, perCat);
    });
  }
  const learned: Learned = new Map();
  for (const [w, perCat] of tally) {
    const rows = [...perCat.entries()];
    const strongTotal = rows.reduce((s, [, n]) => s + n.strong, 0);
    const weakTotal = rows.reduce((s, [, n]) => s + n.weak, 0);
    const [id, n] = rows.sort((a, b) => b[1].strong - a[1].strong || b[1].weak - a[1].weak)[0];
    if (n.strong > 0 && n.strong / strongTotal >= 0.6) learned.set(w, { cat: byId.get(id)!, strength: 2.6 + 0.6 * Math.min(n.strong - 1, 2) });
    else if (n.weak > 0 && n.weak / weakTotal >= 0.6) learned.set(w, { cat: byId.get(id)!, strength: 1.2 });
  }
  const perSig = learnedCache.get(history) ?? new Map<string, Learned>();
  perSig.set(sig, learned);
  learnedCache.set(history, perSig);
  return learned;
}

/**
 * Sugiere la categoría a partir del detalle escrito o dictado.
 * 1) Mismo detalle que algo ya cargado → misma categoría.
 * 2) Palabras clave de cada categoría (editables en Ajustes) y palabras aprendidas de sus correcciones.
 * 3) Diccionario de comercios de México y cosas comunes (Oxxo, Telcel, croquetas, tortillas…).
 * 4) Plurales, prefijos ("supermercadito") y errores de una letra ("soriaba").
 */
export function detectCategory(note: string, categories: Category[], history: Tx[]): Category | null {
  const n = normalize(note);
  if (!n) return null;
  const active = categories.filter((c) => !c.archived);
  const byId = new Map(active.map((c) => [c.id, c]));

  const exact = history.find((t) => !t.recurring_id && !t.goal_id && normalize(t.note) === n && t.category_id && byId.has(t.category_id));
  if (exact) return byId.get(exact.category_id!)!;

  const sig = signature(active);
  const index = buildIndex(active, sig);
  return score(n.split(" "), index, learnWords(history, active, index, sig)).cat;
}

export interface Frequent {
  note: string;
  categoryId: string | null;
  kind: Kind;
  lastAmount: number;
  count: number;
}

/** Lo que más cargan (sin contar fijos ni aportes): sirve de atajo de un toque. */
export function frequentEntries(history: Tx[], limit = 8): Frequent[] {
  const groups = new Map<string, Frequent & { at: string }>();
  for (const t of history) {
    if (t.recurring_id || t.goal_id || !t.note) continue;
    const key = `${normalize(t.note)}|${t.category_id}|${t.kind}`;
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { note: t.note, categoryId: t.category_id, kind: t.kind, lastAmount: t.amount, count: 1, at: t.created_at });
  }
  return [...groups.values()]
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.count - a.count || (b.at > a.at ? 1 : -1))
    .slice(0, limit);
}

/** Orden de categorías por uso reciente: las más usadas primero en la grilla. */
export function rankCategories(categories: Category[], history: Tx[], kind: Kind) {
  const uses = new Map<string, number>();
  for (const t of history) if (t.category_id && t.kind === kind) uses.set(t.category_id, (uses.get(t.category_id) ?? 0) + 1);
  return categories
    .filter((c) => c.kind === kind && !c.archived && c.bucket !== "saving")
    .sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.sort - b.sort);
}
