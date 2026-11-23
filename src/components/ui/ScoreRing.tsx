/** Anillo del puntaje de salud financiera (0–100). */
export function ScoreRing({ score, size = 64, stroke = 7, onDark = false }: { score: number | null; size?: number; stroke?: number; onDark?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = score == null ? 0 : Math.max(0, Math.min(100, score));
  const color = score == null ? "transparent" : v >= 70 ? "var(--pos)" : v >= 45 ? "var(--warn)" : "var(--neg)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score == null ? "Sin puntaje todavía" : `Puntaje ${v} de 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={onDark ? "rgb(255 255 255 / .16)" : "var(--surface-2)"} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={onDark && score != null ? "#fff" : color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray .6s ease" }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill={onDark ? "#fff" : "var(--ink)"}
        style={{ font: `800 ${size * 0.3}px var(--font-display)` }}>
        {score == null ? "–" : v}
      </text>
    </svg>
  );
}
