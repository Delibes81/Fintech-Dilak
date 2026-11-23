export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const pad = (n: number) => String(n).padStart(2, "0");

export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => isoOf(new Date());
export const currentYM = () => todayISO().slice(0, 7);
export const ymOf = (iso: string) => iso.slice(0, 7);

export function shiftDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return isoOf(new Date(y, m - 1, d + n));
}

export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export const firstDay = (ym: string) => `${ym}-01`;
export const monthNumber = (ym: string) => Number(ym.slice(5, 7));
export const monthName = (ym: string) => MONTHS[monthNumber(ym) - 1];
export const monthLabel = (ym: string) => `${monthName(ym)} ${ym.slice(0, 4)}`;
export const monthShort = (ym: string) => monthName(ym).slice(0, 3);

/** Fecha de vencimiento de un día en un mes, recortando a fin de mes (31 → 30 en abril). */
export const dueDateIn = (ym: string, day: number) => `${ym}-${pad(Math.min(day, daysInMonth(ym)))}`;

export function dayLabel(iso: string, today = todayISO()) {
  if (iso === today) return "Hoy";
  if (iso === shiftDays(today, -1)) return "Ayer";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return `${DOW[dt.getDay()]} ${d} ${MONTHS[m - 1].slice(0, 3)}${sameYear ? "" : ` ${y}`}`;
}

/** Meses completos entre dos fechas (para metas con fecha objetivo). */
export function monthsBetween(fromISO: string, toISO: string) {
  const [y1, m1] = fromISO.split("-").map(Number);
  const [y2, m2] = toISO.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}
