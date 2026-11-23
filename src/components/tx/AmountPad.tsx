"use client";
import { Delete } from "lucide-react";

const LOCALE_SEP: Record<string, { th: string; dec: string; sym: string }> = {
  USD: { th: ",", dec: ".", sym: "US$" }, EUR: { th: ".", dec: ",", sym: "€" }, MXN: { th: ",", dec: ".", sym: "$" },
  PEN: { th: ",", dec: ".", sym: "S/" },
};
const sepFor = (c: string) => LOCALE_SEP[c] ?? { th: ".", dec: ",", sym: "$" };

/** Valor interno: dígitos y, opcionalmente, un separador decimal "." (ej. "45000", "12.5"). */
export const padToNumber = (v: string) => (v ? Number(v) : 0);
export const numberToPad = (n: number) => (n ? String(Math.round(n * 100) / 100) : "");

export function AmountDisplay({ value, currency, tone }: { value: string; currency: string; tone: "expense" | "income" }) {
  const { th, dec, sym } = sepFor(currency);
  const [int = "", frac] = value.split(".");
  const intFmt = (int || "0").replace(/\B(?=(\d{3})+(?!\d))/g, th);
  const len = intFmt.length + (frac != null ? frac.length + 1 : 0);
  const size = len > 11 ? 32 : len > 8 ? 40 : 48;
  return (
    <div className="flex items-baseline justify-center gap-1.5 py-1 [@media(max-height:720px)]:py-0" aria-live="polite">
      <span className="font-display text-[22px] font-bold text-ink-3">{tone === "expense" ? "−" : "+"}{sym}</span>
      <span
        className={`num font-display font-extrabold tracking-[-0.03em] transition-colors ${value ? (tone === "expense" ? "text-ink" : "text-pos") : "text-ink-3"}`}
        style={{ fontSize: size, lineHeight: 1.05 }}
      >
        {intFmt}{frac != null && <>{dec}{frac}</>}
      </span>
    </div>
  );
}

export function pressKey(value: string, key: string, allowDecimal: boolean): string {
  if (key === "back") return value.slice(0, -1);
  if (key === "clear") return "";
  if (key === "dec") return !allowDecimal || value.includes(".") ? value : (value || "0") + ".";
  if (key === "000") return value && value !== "0" && !value.includes(".") ? (value + "000").slice(0, 10) : value;
  if (!/^\d$/.test(key)) return value;
  const [int, frac] = value.split(".");
  if (frac != null) return frac.length >= 2 ? value : value + key;
  if ((int ?? "").length >= 10) return value;
  return value === "0" ? key : value + key;
}

export function AmountPad({ onKey, allowDecimal }: { onKey: (k: string) => void; allowDecimal: boolean }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", allowDecimal ? "dec" : "000", "0", "back"];
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Teclado numérico">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onKey(k)}
          onContextMenu={(e) => { if (k === "back") { e.preventDefault(); onKey("clear"); } }}
          aria-label={k === "back" ? "Borrar" : k === "dec" ? "Coma decimal" : k === "000" ? "Tres ceros" : k}
          className="num h-12 select-none [@media(max-height:720px)]:h-10 rounded-2xl bg-surface-2 font-display text-[22px] font-bold text-ink transition-[transform,background-color] active:scale-95 active:bg-surface-3"
        >
          {k === "back" ? <Delete className="mx-auto" size={22} /> : k === "dec" ? "," : k}
        </button>
      ))}
    </div>
  );
}
