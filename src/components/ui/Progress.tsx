/** Barra de progreso con marca opcional (por ejemplo, "dónde deberían estar a esta altura del mes"). */
export function Progress({ value, max, tone = "accent", marker, height = 8, label }: {
  value: number; max: number; tone?: "accent" | "pos" | "neg" | "warn" | "ink"; marker?: number; height?: number; label?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const m = marker != null && max > 0 ? Math.min(100, (marker / max) * 100) : null;
  const color = tone === "ink" ? "var(--ink)" : `var(--${tone})`;
  return (
    <div className="relative w-full overflow-visible rounded-full bg-surface-2" style={{ height }} role="progressbar"
      aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      {m != null && (
        <span className="absolute top-1/2 h-[calc(100%+8px)] w-[2px] -translate-y-1/2 rounded-full bg-ink/60" style={{ left: `calc(${m}% - 1px)` }} aria-hidden="true" />
      )}
    </div>
  );
}
