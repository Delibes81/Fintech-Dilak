"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import type { Tx } from "@/lib/types";

/**
 * Gasto acumulado del mes (área) contra el "ritmo sano" (línea punteada):
 * lo que pueden gastar en el mes después de reservar el ahorro, repartido parejo.
 * Pensado para la tarjeta oscura principal.
 */
export function SpendChart({ txs, ym, daysInMonth, elapsedDays, monthBudget, fmt }: {
  txs: Tx[]; ym: string; daysInMonth: number; elapsedDays: number; monthBudget: number; fmt: (n: number) => string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const byDay = new Array(daysInMonth).fill(0) as number[];
  for (const t of txs) {
    if (!t.occurred_on.startsWith(ym)) continue;
    const d = Number(t.occurred_on.slice(8, 10)) - 1;
    if (d >= 0 && d < daysInMonth) byDay[d] += t.amount;
  }
  const days = Math.max(1, elapsedDays);
  const cum: number[] = [];
  byDay.slice(0, days).reduce((acc, v, i) => (cum[i] = acc + v), 0);

  const W = 600, H = 150, PX = 4, PT = 18, PB = 22;
  const max = Math.max(monthBudget, cum[cum.length - 1] ?? 0, 1) * 1.08;
  const x = (i: number) => PX + (i / Math.max(1, daysInMonth - 1)) * (W - PX * 2);
  const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
  const line = cum.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = cum.length ? `${line} L${x(cum.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";
  const lastI = cum.length - 1;
  const last = cum[lastI] ?? 0;
  const paceToday = monthBudget > 0 ? (monthBudget / daysInMonth) * days : 0;
  const over = monthBudget > 0 && last > paceToday;
  const stroke = over ? "#ffb4c0" : "#7ee8ff";
  const h = hover != null && hover <= lastI ? hover : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
        aria-label={`Gasto acumulado ${fmt(last)}${monthBudget > 0 ? `, ritmo sano a hoy ${fmt(paceToday)}` : ""}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (daysInMonth - 1));
          setHover(Math.max(0, Math.min(daysInMonth - 1, i)));
        }}
        onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={stroke} stopOpacity="0.35" />
            <stop offset="1" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PX} x2={W - PX} y1={PT + f * (H - PT - PB)} y2={PT + f * (H - PT - PB)} stroke="rgb(255 255 255 / .06)" />
        ))}
        {monthBudget > 0 && (
          <>
            <line x1={x(0)} y1={y(0)} x2={x(daysInMonth - 1)} y2={y(monthBudget)} stroke="rgb(255 255 255 / .45)" strokeWidth="1.5" strokeDasharray="4 5" />
            <text x={W - PX} y={y(monthBudget) - 6} textAnchor="end" fontSize="11" fill="rgb(255 255 255 / .6)" style={{ fontFamily: "var(--font-mono)" }}>ritmo sano</text>
          </>
        )}
        {area && (
          <motion.path d={area} fill={`url(#a${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} />
        )}
        {line && (
          <motion.path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${stroke}88)` }} />
        )}
        {lastI >= 0 && (
          <motion.circle cx={x(lastI)} cy={y(last)} r="4.5" fill="#fff" stroke={stroke} strokeWidth="3"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: "spring", stiffness: 400, damping: 15 }} />
        )}
        {h != null && (
          <g>
            <line x1={x(h)} x2={x(h)} y1={PT - 6} y2={y(0)} stroke="rgb(255 255 255 / .35)" />
            <circle cx={x(h)} cy={y(cum[h])} r="4" fill="#fff" />
          </g>
        )}
        <text x={PX} y={H - 5} fontSize="11" fill="rgb(255 255 255 / .45)" style={{ fontFamily: "var(--font-mono)" }}>1</text>
        <text x={W - PX} y={H - 5} textAnchor="end" fontSize="11" fill="rgb(255 255 255 / .45)" style={{ fontFamily: "var(--font-mono)" }}>{daysInMonth}</text>
      </svg>
      {h != null && (
        <div className="pointer-events-none absolute top-0 right-0 rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-[12px] text-white backdrop-blur">
          <span className="num">Día {h + 1}</span> · <span className="num font-semibold">{fmt(cum[h])}</span>
        </div>
      )}
    </div>
  );
}
