"use client";
import { motion } from "motion/react";

/** Barra de progreso animada, con marca opcional ("dónde deberían estar hoy"). */
export function Progress({ value, max, tone = "accent", marker, height = 6, label }: {
  value: number; max: number; tone?: "accent" | "pos" | "neg" | "warn"; marker?: number; height?: number; label?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const m = marker != null && max > 0 ? Math.min(100, (marker / max) * 100) : null;
  const fill = tone === "accent" ? "linear-gradient(90deg, var(--accent), var(--accent-2))" : `var(--${tone})`;
  return (
    <div className="relative w-full rounded-full bg-surface-3/70" style={{ height }} role="progressbar"
      aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-label={label}>
      <motion.div className="h-full rounded-full" style={{ background: fill, boxShadow: tone === "accent" ? "0 0 12px -2px var(--accent)" : undefined }}
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 90, damping: 22 }} />
      {m != null && (
        <span className="absolute top-1/2 h-[calc(100%+8px)] w-[2px] -translate-y-1/2 rounded-full bg-ink/70" style={{ left: `calc(${m}% - 1px)` }} aria-hidden="true" />
      )}
    </div>
  );
}
