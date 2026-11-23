/**
 * Intérprete de gastos dictados en español.
 * "Gasté 12 mil en farmacia" · "cobré el sueldo 900 mil" · "ayer dos mil quinientos de nafta"
 * "45 mil 500 súper categoría supermercado" · "un millón doscientos mil del auto"
 */
import { parseAmount } from "./money";
import { detectCategory, normalize, SAVING_HINT } from "./smart";
import { shiftDays } from "./dates";
import type { Category, Kind, Tx } from "./types";

const UNITS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
  setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};
const THOUSAND = new Set(["mil", "luca", "lucas", "k"]);
const MILLION = new Set(["millon", "millones", "palo", "palos"]);
const CURRENCY_WORDS = new Set(["peso", "pesos", "varo", "varos", "dolar", "dolares", "euro", "euros", "mangos", "pe"]);

const INCOME_WORDS = [
  "cobre", "cobramos", "cobro", "me pagaron", "nos pagaron", "pagaron", "ingreso", "ingresaron", "entraron", "entro",
  "recibi", "recibimos", "deposito", "depositaron", "vendi", "vendimos", "gane", "ganamos",
];
const FILLER = new Set([
  "gaste", "gastamos", "pague", "pagamos", "compre", "compramos", "cobre", "cobramos", "recibi", "recibimos", "fue", "fueron",
  "son", "es", "de", "del", "en", "el", "la", "los", "las", "un", "una", "por", "para", "con", "y", "a", "al", "me", "nos",
  "pagaron", "puse", "pusimos", "meti", "metimos", "salio", "salieron", "costo", "cuesta", "hoy", "ayer", "anteayer", "antier", "que", "lo", "le",
]);
const WEEKDAYS: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

export interface VoiceResult {
  transcript: string;
  amount: number | null;
  kind: Kind;
  note: string;
  category: Category | null;
  date: string;
}

type Tok = { raw: string; n: string };

/** Valor de una secuencia de tokens numéricos ("dos mil quinientos", "45 mil 500"). null si no es número. */
function numberValue(toks: Tok[]): number | null {
  let total = 0, current = 0, any = false;
  for (const t of toks) {
    if (t.n === "y") continue;
    const digit = /\d/.test(t.raw) ? parseAmount(t.raw.replace(/[^\d.,kK]/g, "")) : NaN;
    if (!Number.isNaN(digit)) { current += digit; any = true; continue; }
    if (t.n in UNITS) { current += UNITS[t.n]; any = true; continue; }
    if (THOUSAND.has(t.n)) { total += (current || 1) * 1000; current = 0; any = true; continue; }
    if (MILLION.has(t.n)) { total = (total + (current || 1)) * 1_000_000; current = 0; any = true; continue; }
    return null;
  }
  return any ? total + current : null;
}

const isNumTok = (t: Tok) => /\d/.test(t.raw) || t.n in UNITS || THOUSAND.has(t.n) || MILLION.has(t.n);

export function parseSpoken(text: string, categories: Category[], history: Tx[], today: string): VoiceResult {
  const transcript = text.trim();
  const toks: Tok[] = transcript.split(/\s+/).filter(Boolean).map((raw) => ({ raw, n: normalize(raw) }));
  const used = new Set<number>();

  // 1) Monto: la secuencia numérica de mayor valor ("un café de 3500" → 3500, no 1)
  let best: { from: number; to: number; value: number } | null = null;
  for (let i = 0; i < toks.length; i++) {
    if (!isNumTok(toks[i])) continue;
    let j = i;
    while (j + 1 < toks.length && (isNumTok(toks[j + 1]) || (toks[j + 1].n === "y" && j + 2 < toks.length && isNumTok(toks[j + 2])))) j++;
    const value = numberValue(toks.slice(i, j + 1));
    if (value != null && value > 0 && (!best || value > best.value)) best = { from: i, to: j, value };
    i = j;
  }
  if (best) {
    for (let k = best.from; k <= best.to; k++) used.add(k);
    // "pesos", "varos", "lucas" pegados al monto
    if (best.to + 1 < toks.length && CURRENCY_WORDS.has(toks[best.to + 1].n)) used.add(best.to + 1);
  }

  // 2) Fecha
  let date = today;
  toks.forEach((t, i) => {
    if (t.n === "ayer") { date = shiftDays(today, -1); used.add(i); }
    else if (t.n === "anteayer" || t.n === "antier") { date = shiftDays(today, -2); used.add(i); }
    else if (t.n === "hoy") used.add(i);
    else if (t.n in WEEKDAYS && i > 0 && ["el", "este", "pasado"].includes(toks[i - 1].n)) {
      const [y, m, d] = today.split("-").map(Number);
      const diff = (new Date(y, m - 1, d).getDay() - WEEKDAYS[t.n] + 7) % 7;
      date = shiftDays(today, -diff);
      used.add(i); used.add(i - 1);
    }
  });

  // 3) Categoría explícita: "... categoría salud"
  const active = categories.filter((c) => !c.archived);
  let category: Category | null = null;
  const ci = toks.findIndex((t) => t.n === "categoria");
  if (ci >= 0) {
    const words = toks.slice(ci + 1).filter((_, k) => !used.has(ci + 1 + k)).map((t) => t.n).filter((w) => !FILLER.has(w));
    const phrase = words.join(" ");
    category = active.find((c) => normalize(c.name) === phrase)
      ?? active.find((c) => words.length > 0 && normalize(c.name).startsWith(words[0]))
      ?? active.find((c) => words.some((w) => w.length > 3 && normalize(c.name).includes(w))) ?? null;
    for (let k = ci; k < toks.length; k++) used.add(k);
  }

  // 4) Tipo: ingreso si hay verbos de cobro
  const flat = ` ${toks.map((t) => t.n).join(" ")} `;
  let kind: Kind = INCOME_WORDS.some((w) => flat.includes(` ${w} `)) ? "income" : "expense";

  // 5) Concepto: lo que queda sin números, fechas ni muletillas
  const rest = toks.filter((t, i) => !used.has(i) && !CURRENCY_WORDS.has(t.n));
  while (rest.length && FILLER.has(rest[0].n)) rest.shift();
  while (rest.length && FILLER.has(rest[rest.length - 1].n)) rest.pop();
  const note = rest.map((t) => t.raw.replace(/[.,;:!?¿¡]+$/g, "")).join(" ").trim();

  if (!category) category = detectCategory(note || transcript, active.filter((c) => c.bucket !== "saving" || SAVING_HINT.test(flat)), history);
  if (category) kind = category.kind;
  const finalNote = note ? note.charAt(0).toUpperCase() + note.slice(1) : category?.name ?? "";

  return { transcript, amount: best ? Math.round(best.value * 100) / 100 : null, kind, note: finalNote, category, date };
}

/** Monto escrito o dictado dentro de un texto libre (para el campo "detalle"). */
export function amountInText(text: string): number | null {
  if (!/\d|mil|cien|ientos|lucas/.test(normalize(text))) return null;
  const r = parseSpoken(text, [], [], "2000-01-01");
  return r.amount;
}
