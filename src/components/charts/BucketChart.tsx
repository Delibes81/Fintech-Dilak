"use client";
import { motion } from "motion/react";
import type { Bucket } from "@/lib/types";
import { formatPct } from "@/lib/money";

const META: Record<Bucket | "free", { label: string; color: string }> = {
  need: { label: "Necesidades", color: "var(--cat-blue)" },
  want: { label: "Deseos", color: "var(--cat-orange)" },
  saving: { label: "Ahorro", color: "var(--cat-green)" },
  free: { label: "Sin asignar", color: "var(--surface-3)" },
};

/** Cómo se repartió el ingreso, contra la guía 50/30/20. */
export function BucketChart({ income, need, want, saved, targetSaving, fmt }: { income: number; need: number; want: number; saved: number; targetSaving: number; fmt: (n: number) => string }) {
  const free = Math.max(0, income - need - want - saved);
  const total = Math.max(income, need + want + saved);
  const parts = [
    { key: "need" as const, v: need, target: 0.5 },
    { key: "want" as const, v: want, target: 0.3 },
    { key: "saving" as const, v: saved, target: targetSaving },
    { key: "free" as const, v: free, target: null },
  ].filter((p) => p.v > 0 || p.key !== "free");
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-surface" role="img"
        aria-label={parts.map((p) => `${META[p.key].label} ${formatPct(total ? p.v / total : 0)}`).join(", ")}>
        {parts.map((p, i) => p.v > 0 && (
          <motion.span key={p.key} style={{ background: META[p.key].color }} className="h-full first:rounded-l-full last:rounded-r-full"
            initial={{ width: 0 }} animate={{ width: `${(p.v / total) * 100}%` }} transition={{ type: "spring", stiffness: 90, damping: 20, delay: i * 0.08 }} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {parts.map((p) => {
          const pct = income > 0 ? p.v / income : 0;
          const off = p.target != null && income > 0 && (p.key === "saving" ? pct < p.target : pct > p.target + 0.05);
          return (
            <li key={p.key}>
              <p className="flex items-center gap-1.5 text-[13px] text-ink-2"><i className="size-2.5 rounded-[3px]" style={{ background: META[p.key].color }} />{META[p.key].label}</p>
              <p className="num text-[18px] font-semibold">{formatPct(pct)}</p>
              <p className="num text-[12.5px] text-ink-2">{fmt(p.v)}{p.target != null && <span className={off ? " text-warn" : ""}> · guía {formatPct(p.target)}</span>}</p>
            </li>
          );
        })}
      </ul>
      {(free > 0) && <p className="mt-3 text-[13px] text-ink-2">“Sin asignar” es lo que entró y todavía no se gastó ni se apartó. Muévanlo a una meta para que cuente como ahorro.</p>}
    </div>
  );
}
