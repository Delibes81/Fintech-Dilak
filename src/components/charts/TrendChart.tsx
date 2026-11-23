"use client";
import { useState } from "react";
import { formatCompact } from "@/lib/money";
import { monthLabel, monthShort } from "@/lib/dates";

export interface TrendPoint { ym: string; income: number; expense: number; known: boolean }

/** Barras agrupadas ingresos vs. gastos. Un solo eje; tocá o pasá el mouse para ver el detalle. */
export function TrendChart({ data, currency, fmt, selected }: { data: TrendPoint[]; currency: string; fmt: (n: number) => string; selected: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 240, L = 54, R = 8, T = 14, B = 30;
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const raw = max / 3, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  const top = Math.ceil(max / step) * step;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const gw = (W - L - R) / data.length, bw = Math.min(24, gw * 0.28);
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const bar = (x: number, v: number, fill: string) => {
    if (v <= 0) return null;
    const yy = y(v), h = y(0) - yy, r = Math.min(4, h);
    return <path d={`M${x},${y(0)} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${y(0)} Z`} fill={fill} />;
  };
  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <div className="mb-2 flex gap-4 text-[13px] text-ink-2">
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-pos" />Ingresos</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-neg" />Gastos</span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[420px]" role="img" aria-label="Ingresos y gastos de los últimos meses" onMouseLeave={() => setHover(null)}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">{formatCompact(v, currency)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = L + gw * i + gw / 2;
            const sel = d.ym === selected;
            return (
              <g key={d.ym} opacity={hover != null && hover !== i ? 0.45 : 1}>
                {bar(cx - bw - 1.5, d.income, "var(--pos)")}
                {bar(cx + 1.5, d.expense, "var(--neg)")}
                <text x={cx} y={H - 9} textAnchor="middle" fontSize={12} fontWeight={sel ? 800 : 500} fill={sel ? "var(--ink)" : "var(--ink-3)"}>{monthShort(d.ym)}</text>
                <rect x={L + gw * i} y={T} width={gw} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(hover === i ? null : i)} style={{ cursor: "pointer" }} />
              </g>
            );
          })}
        </svg>
      </div>
      {h && (
        <div className="pointer-events-none absolute top-8 right-2 rounded-xl bg-ink px-3 py-2 text-[12.5px] leading-relaxed text-bg shadow-pop">
          <p className="font-bold capitalize">{monthLabel(h.ym)}</p>
          {h.known ? (
            <>
              <p>Ingresos {fmt(h.income)}</p><p>Gastos {fmt(h.expense)}</p>
              <p className="font-semibold">Balance {fmt(h.income - h.expense)}</p>
            </>
          ) : <p>Sin datos cargados</p>}
        </div>
      )}
    </div>
  );
}
