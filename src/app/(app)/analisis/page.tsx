"use client";

import { useEffect, useMemo } from "react";
import { useHousehold } from "@/store/household";
import { useReport } from "@/hooks/useReport";
import { Section } from "@/components/ui/Section";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Progress } from "@/components/ui/Progress";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Empty } from "@/components/ui/Empty";
import { InsightList } from "@/components/insights/InsightList";
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart";
import { BucketChart } from "@/components/charts/BucketChart";
import { addMonths, monthName } from "@/lib/dates";
import { formatPct } from "@/lib/money";
import { ChartNoAxesColumn } from "lucide-react";

export default function Analisis() {
  const hh = useHousehold();
  const { loading, report: r, health, tips } = useReport();

  const trendMonths = useMemo(() => Array.from({ length: 6 }, (_, i) => addMonths(hh.ym, i - 5)), [hh.ym]);
  const { ensureMonths } = hh;
  useEffect(() => { ensureMonths(trendMonths); }, [ensureMonths, trendMonths]);

  const trend: TrendPoint[] = trendMonths.map((ym) => {
    const txs = hh.months[ym];
    const consumption = (txs ?? []).filter((t) => t.kind === "expense" && hh.categories.find((c) => c.id === t.category_id)?.bucket !== "saving");
    return {
      ym, known: Boolean(txs),
      income: (txs ?? []).filter((t) => t.kind === "income").reduce((a, t) => a + t.amount, 0),
      expense: consumption.reduce((a, t) => a + t.amount, 0),
    };
  });

  const txs = hh.months[hh.ym] ?? [];
  const byWho = hh.members.map((m) => ({
    m,
    spent: txs.filter((t) => t.created_by === m.user_id && t.kind === "expense").reduce((a, t) => a + t.amount, 0),
    count: txs.filter((t) => t.created_by === m.user_id).length,
  })).sort((a, b) => b.spent - a.spent);
  const maxWho = Math.max(1, ...byWho.map((w) => w.spent));
  const cats = r.byCategory.filter((l) => l.spent > 0);
  const maxCat = Math.max(1, ...cats.map((l) => Math.max(l.spent, l.avg3 ?? 0)));
  const scoreLabel = health.score == null ? "Sin datos" : health.score >= 70 ? "Sólida" : health.score >= 45 ? "Mejorable" : "En riesgo";

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div>
        <h1 className="font-display text-[26px] font-extrabold tracking-tight">Análisis</h1>
        <p className="text-[14px] text-ink-2">Qué tan sanas están sus finanzas en {monthName(hh.ym)} y qué conviene ajustar.</p>
      </div>

      {/* Salud financiera */}
      <section className="card p-5">
        <div className="flex items-center gap-4">
          <ScoreRing score={health.score} size={92} stroke={9} />
          <div className="min-w-0">
            <p className="eyebrow">Salud financiera</p>
            <p className="font-display text-[24px] font-extrabold tracking-tight">{scoreLabel}</p>
            <p className="text-[13.5px] text-ink-2">{health.score == null ? "Carguen el ingreso del mes para calcularla." : "Combina ahorro, peso de los fijos, fondo de emergencia y presupuestos."}</p>
          </div>
        </div>
        {health.parts.length > 0 && (
          <ul className="mt-5 grid gap-3.5 sm:grid-cols-2">
            {health.parts.map((p) => (
              <li key={p.key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-[14px] font-semibold">{p.label}</span>
                  <span className="num text-[12.5px] text-ink-3">{Math.round(p.points)}/{p.max}</span>
                </div>
                <Progress value={p.points} max={p.max} tone={p.points / p.max >= 0.7 ? "pos" : p.points / p.max >= 0.4 ? "warn" : "neg"} height={6} label={p.label} />
                <p className="mt-1 text-[12.5px] text-ink-2">{p.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Números clave */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Ingresos" value={hh.fmt(r.income)} tone="pos" />
        <Kpi label="Gastos" value={hh.fmt(r.consumption)} tone="neg" sub={r.avgConsumption3 ? `prom. ${hh.fmt(r.avgConsumption3)}` : undefined} />
        <Kpi label="Ahorrado" value={hh.fmt(r.saved)} sub="aportes a metas" />
        {(() => {
          const rate = r.phase === "current" ? r.projectedSavingsRate : r.savingsRate;
          return (
            <Kpi label={r.phase === "current" ? "Ahorro proyectado" : "Tasa de ahorro"} value={rate != null ? formatPct(Math.max(-9.99, rate)) : "–"}
              sub={r.phase === "current" && r.savingsRate != null ? `hasta hoy ${formatPct(r.savingsRate)} · meta ${hh.household.savings_target_pct}%` : `meta ${hh.household.savings_target_pct}%`}
              tone={rate != null && rate * 100 >= hh.household.savings_target_pct ? "pos" : rate != null && rate < 0 ? "neg" : undefined} />
          );
        })()}
      </div>

      {tips.length > 0 && (
        <Section title="Recomendaciones" card={false}>
          <InsightList items={tips} />
        </Section>
      )}

      <Section title="Cómo se repartió el ingreso" aside="Guía 50/30/20">
        {r.income > 0 ? (
          <BucketChart income={r.income} need={r.buckets.need} want={r.buckets.want} saved={r.saved} targetSaving={hh.household.savings_target_pct / 100} fmt={hh.fmt} />
        ) : <p className="text-[14px] text-ink-2">Sin ingresos cargados en {monthName(hh.ym)}.</p>}
      </Section>

      <Section title="En qué se fue la plata" aside={cats.length ? `${cats.length} categorías` : undefined}>
        {loading ? <div className="skeleton h-40" /> : cats.length === 0 ? (
          <Empty title="Sin gastos todavía" icon={<ChartNoAxesColumn size={22} />}>Cuando carguen gastos van a ver el detalle por categoría, comparado con su promedio.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {cats.map((l) => {
              const delta = l.avg3 ? l.spent / l.avg3 - 1 : null;
              return (
                <li key={l.category.id} className="flex gap-3">
                  <CategoryIcon category={l.category} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14.5px] font-semibold">{l.category.name}</span>
                      <span className="num shrink-0 font-display font-bold">{hh.fmt(l.spent)}<span className="ml-1.5 text-[12px] font-semibold text-ink-3">{formatPct(r.consumption ? l.spent / r.consumption : 0)}</span></span>
                    </div>
                    <div className="relative mt-1.5 h-2 rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(l.spent / maxCat) * 100}%` }} />
                      {l.avg3 ? <span className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded bg-ink/60" style={{ left: `${(l.avg3 / maxCat) * 100}%` }} title="Promedio 3 meses" /> : null}
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-2">
                      {l.avg3 ? <>Promedio {hh.fmt(l.avg3)} · <span className={delta! > 0.15 ? "text-warn font-semibold" : delta! < -0.1 ? "text-pos font-semibold" : ""}>{delta! >= 0 ? "+" : ""}{formatPct(delta!)}</span></> : "Sin historial para comparar"}
                      {l.budget ? <> · techo {hh.fmt(l.budget)}</> : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {cats.some((l) => l.avg3) && <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-ink-3"><span className="inline-block h-3 w-0.5 rounded bg-ink/60" /> marca el promedio de los últimos 3 meses</p>}
      </Section>

      <Section title="Últimos 6 meses">
        <TrendChart data={trend} currency={hh.household.currency} fmt={hh.fmt} selected={hh.ym} />
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Fijos y variables">
          {r.consumption > 0 ? (
            <>
              <div className="flex h-3.5 gap-[2px] overflow-hidden rounded-full">
                <span className="h-full rounded-l-full bg-accent" style={{ width: `${(r.fixedPaid / r.consumption) * 100}%` }} />
                <span className="h-full flex-1 rounded-r-full bg-accent/30" />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[13.5px]">
                <div><dt className="text-ink-2">Fijos pagados</dt><dd className="num font-display text-[17px] font-bold">{hh.fmt(r.fixedPaid)}</dd></div>
                <div><dt className="text-ink-2">Del día a día</dt><dd className="num font-display text-[17px] font-bold">{hh.fmt(r.variable)}</dd></div>
              </dl>
              {r.phase === "current" && <p className="mt-2 text-[13px] text-ink-2">Proyección del gasto variable a fin de mes: <b className="text-ink">{hh.fmt(r.projectedVariable)}</b>.</p>}
            </>
          ) : <p className="text-[14px] text-ink-2">Sin gastos todavía.</p>}
        </Section>

        <Section title="Quién cargó qué">
          {byWho.every((w) => w.count === 0) ? <p className="text-[14px] text-ink-2">Sin movimientos todavía.</p> : (
            <ul className="flex flex-col gap-3">
              {byWho.map(({ m, spent, count }) => (
                <li key={m.user_id} className="flex items-center gap-3">
                  <Avatar member={m} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">{hh.memberName(m.user_id)}</span>
                      <span className="num text-[13px] text-ink-2"><b className="text-ink">{hh.fmt(spent)}</b> · {count} {count === 1 ? "carga" : "cargas"}</span>
                    </div>
                    <div className="mt-1.5"><Progress value={spent} max={maxWho} height={6} label={`Gastos de ${hh.memberName(m.user_id)}`} /></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className={`num mt-1 truncate font-display text-[20px] font-bold ${tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : ""}`}>{value}</p>
      {sub && <p className="truncate text-[12.5px] text-ink-2">{sub}</p>}
    </div>
  );
}
