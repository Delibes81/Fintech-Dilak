"use client";
import { motion } from "motion/react";
import { useId } from "react";

/** Anillo del puntaje de salud financiera (0–100) con trazo animado y degradé. */
export function ScoreRing({ score, size = 64, stroke = 6, onDark = false }: { score: number | null; size?: number; stroke?: number; onDark?: boolean }) {
  const id = useId();
  const r = (size - stroke) / 2;
  const v = score == null ? 0 : Math.max(0, Math.min(100, score));
  const [a, b] = score == null ? ["transparent", "transparent"] : v >= 70 ? ["#34e0a1", "#38d6ff"] : v >= 45 ? ["#ffb547", "#ff8a52"] : ["#ff6b85", "#ff8a52"];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score == null ? "Sin puntaje todavía" : `Puntaje ${v} de 100`}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={onDark ? "rgb(255 255 255 / .12)" : "var(--surface-3)"} strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#g${id})`} strokeWidth={stroke} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} initial={{ pathLength: 0 }} animate={{ pathLength: v / 100 }}
        transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
        style={{ filter: score != null ? `drop-shadow(0 0 6px ${a}66)` : undefined }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill={onDark ? "#fff" : "var(--ink)"}
        style={{ font: `600 ${size * 0.3}px var(--font-mono)`, letterSpacing: "-0.04em" }}>
        {score == null ? "–" : v}
      </text>
    </svg>
  );
}
