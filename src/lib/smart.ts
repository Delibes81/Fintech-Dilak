import type { Category, Kind, Tx } from "./types";

export const normalize = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Sugiere la categoría a partir del detalle escrito.
 * 1) Aprende de lo que ya cargaron (mismo detalle → misma categoría).
 * 2) Palabras clave de cada categoría (editables en Ajustes).
 * 3) Coincidencia por prefijo ("supermercadito", "farmacity").
 */
export function detectCategory(note: string, categories: Category[], history: Tx[]): Category | null {
  const n = normalize(note);
  if (!n) return null;
  const active = categories.filter((c) => !c.archived);
  const byId = new Map(active.map((c) => [c.id, c]));

  const learned = history.find((t) => !t.recurring_id && !t.goal_id && normalize(t.note) === n && t.category_id);
  if (learned && byId.has(learned.category_id!)) return byId.get(learned.category_id!)!;

  const words = n.split(" ");
  const padded = ` ${n} `;
  const kw = active.map((c) => ({ c, k: [...c.keywords.map(normalize), normalize(c.name)] }));
  for (const { c, k } of kw) if (k.some((x) => x.includes(" ") && padded.includes(` ${x} `))) return c;
  for (const w of words) for (const { c, k } of kw) if (k.includes(w)) return c;
  for (const w of words)
    if (w.length >= 4)
      for (const { c, k } of kw) if (k.some((x) => x.length >= 4 && w.startsWith(x))) return c;
  return null;
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
