"use client";
import { AnimatePresence, motion } from "motion/react";
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
  const text = intFmt + (frac != null ? dec + frac : "");
  const chars = text.split("");
  return (
    <div className="flex items-baseline justify-center gap-1.5 py-1 [@media(max-height:720px)]:py-0" aria-live="polite" aria-label={`${sym} ${text}`}>
      <span className="num text-[20px] font-medium text-ink-3">{tone === "expense" ? "−" : "+"}{sym}</span>
      <span className={`num flex font-semibold tracking-[-0.05em] transition-colors ${value ? (tone === "expense" ? "text-ink" : "text-pos") : "text-ink-3"}`}
        style={{ fontSize: size, lineHeight: 1.05 }} aria-hidden="true">
        <AnimatePresence initial={false} mode="popLayout">
          {chars.map((ch, i) => (
            <motion.span key={`${chars.length - i}-${ch}`} layout="position"
              initial={{ y: "0.5em", opacity: 0, filter: "blur(4px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: "-0.4em", opacity: 0, filter: "blur(4px)", transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 600, damping: 32 }}>
              {ch}
            </motion.span>
          ))}
        </AnimatePresence>
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

export function AmountPad({ onKey, allowDecimal, currency }: { onKey: (k: string) => void; allowDecimal: boolean; currency: string }) {
  const { dec } = sepFor(currency);
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", allowDecimal ? "dec" : "000", "0", "back"];
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Teclado numérico">
      {keys.map((k) => (
        <motion.button
          key={k}
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => onKey(k)}
          onContextMenu={(e) => { if (k === "back") { e.preventDefault(); onKey("clear"); } }}
          aria-label={k === "back" ? "Borrar" : k === "dec" ? (dec === "." ? "Punto decimal" : "Coma decimal") : k === "000" ? "Tres ceros" : k}
          className="num h-12 select-none rounded-2xl border border-line bg-surface-2 text-[21px] font-medium text-ink transition-colors active:bg-surface-3 [@media(max-height:720px)]:h-10"
        >
          {k === "back" ? <Delete className="mx-auto" size={21} /> : k === "dec" ? dec : k}
        </motion.button>
      ))}
    </div>
  );
}
