const LOCALES: Record<string, string> = {
  ARS: "es-AR", MXN: "es-MX", CLP: "es-CL", COP: "es-CO", UYU: "es-UY",
  PEN: "es-PE", USD: "es-US", EUR: "es-ES",
};

export const CURRENCIES = [
  { code: "ARS", label: "Peso argentino" },
  { code: "MXN", label: "Peso mexicano" },
  { code: "CLP", label: "Peso chileno" },
  { code: "COP", label: "Peso colombiano" },
  { code: "UYU", label: "Peso uruguayo" },
  { code: "PEN", label: "Sol peruano" },
  { code: "USD", label: "Dólar" },
  { code: "EUR", label: "Euro" },
];

/** Monedas que en la práctica no usan centavos al cargar gastos. */
export const NO_CENTS = new Set(["ARS", "CLP", "COP", "UYU"]);

const cache = new Map<string, Intl.NumberFormat>();
function nf(currency: string, kind: "int" | "dec" | "compact") {
  const key = `${currency}:${kind}`;
  let f = cache.get(key);
  if (!f) {
    const locale = LOCALES[currency] ?? "es";
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      ...(kind === "int" && { maximumFractionDigits: 0 }),
      ...(kind === "dec" && { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ...(kind === "compact" && { notation: "compact", maximumFractionDigits: 1 }),
    });
    cache.set(key, f);
  }
  return f;
}

export function formatMoney(n: number, currency: string, opts: { sign?: boolean } = {}) {
  const abs = Math.abs(n || 0);
  // En pesos argentinos, chilenos, etc. los centavos son ruido: se redondea al entero.
  const rounded = NO_CENTS.has(currency) ? Math.round(abs) : Math.round(abs * 100) / 100;
  let s = nf(currency, Number.isInteger(rounded) ? "int" : "dec").format(rounded);
  if (opts.sign) s = (n < 0 ? "−" : "+") + s;
  else if (n < 0) s = "−" + s;
  return s;
}

export const formatCompact = (n: number, currency: string) => nf(currency, "compact").format(n || 0);

export const formatPct = (ratio: number, digits = 0) =>
  `${(ratio * 100).toLocaleString("es", { maximumFractionDigits: digits, minimumFractionDigits: 0 })}%`;

/** Interpreta montos escritos a mano: "45.000", "45,50", "1.234,56", "45k". */
export function parseAmount(raw: string): number {
  let s = String(raw ?? "").trim().toLowerCase().replace(/[$\s]/g, "");
  let mult = 1;
  if (/(k|mil)$/.test(s)) { mult = 1000; s = s.replace(/(k|mil)$/, ""); }
  if (!s) return NaN;
  const hasDot = s.includes("."), hasComma = s.includes(",");
  if (hasDot && hasComma) {
    const dec = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    s = s.split(dec === "." ? "," : ".").join("").replace(dec, ".");
  } else if (hasDot) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  } else if (hasComma) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  const n = Number(s) * mult;
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}
