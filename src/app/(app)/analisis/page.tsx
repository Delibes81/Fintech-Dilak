"use client";

import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal, RevealItem } from "@/components/motion/Reveal";
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
import { Bike, ChartNoAxesColumn } from "lucide-react";
import type { FoodAppsSummary } from "@/lib/finance/foodApps";

export default function Analisis() {
  const hh = useHousehold();
  const { loading, report: r, health, tips, food } = useReport();

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
    <PageTransition>
    <Reveal className="flex flex-col gap-4 pt-2 md:gap-5">
      <RevealItem>
        <p className="eyebrow">Inteligencia financiera</p>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold md:text-[32px]">Análisis de <span className="text-gradient">{monthName(hh.ym)}</span></h1>
        <p className="mt-1 text-[14px] text-ink-2">Qué tan sanas están sus finanzas y qué conviene ajustar.</p>
      </RevealItem>
      <RevealItem className="flex flex-col gap-4 md:gap-5">

      {/* Salud financiera */}
      <section className="card p-5">
        <div className="flex items-center gap-4">
          <ScoreRing score={health.score} size={92} stroke={9} />
          <div className="min-w-0">
            <p className="eyebrow">Salud financiera</p>
            <p className="text-[24px] font-semibold tracking-tight">{scoreLabel}</p>
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
                      <span className="num shrink-0 font-bold">{hh.fmt(l.spent)}<span className="ml-1.5 text-[12px] font-semibold text-ink-3">{formatPct(r.consumption ? l.spent / r.consumption : 0)}</span></span>
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

      <Section title="Comida a domicilio" aside="Uber Eats · Rappi · DiDi Food">
        <FoodApps food={food} fmt={hh.fmt} month={monthName(hh.ym)} />
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
                <div><dt className="text-ink-2">Fijos pagados</dt><dd className="num text-[17px] font-bold">{hh.fmt(r.fixedPaid)}</dd></div>
                <div><dt className="text-ink-2">Del día a día</dt><dd className="num text-[17px] font-bold">{hh.fmt(r.variable)}</dd></div>
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
      </RevealItem>
    </Reveal>
    </PageTransition>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className={`num mt-1 truncate text-[20px] font-bold ${tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : ""}`}>{value}</p>
      {sub && <p className="truncate text-[12.5px] text-ink-2">{sub}</p>}
    </div>
  );
}

/** Cuánto se va en cada app de comida a domicilio, con ticket promedio, comparación y proyección anual. */
function FoodApps({ food, fmt, month }: { food: FoodAppsSummary; fmt: (n: number) => string; month: string }) {
  if (food.orders === 0) {
    return (
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-3"><Bike size={20} /></span>
        <p className="text-[14px] text-ink-2">
          {food.avgMonthly ? <>Sin pedidos en {month}. Su promedio de los meses anteriores es <b className="text-ink">{fmt(food.avgMonthly)}</b>.</>
            : <>Cuando carguen pedidos con el nombre de la app (por ejemplo <i>“Uber Eats 180”</i> o <i>“Rappi tacos”</i>) van a ver acá cuánto se va en cada una.</>}
        </p>
      </div>
    );
  }
  const max = Math.max(1, ...food.byApp.map((a) => a.total));
  const vsAvg = food.avgMonthly ? (food.projected ?? food.total) / food.avgMonthly - 1 : null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <p className="num text-[30px] leading-none font-semibold tracking-[-0.04em]">{fmt(food.total)}</p>
          <p className="mt-1.5 text-[13px] text-ink-2">
            {food.orders} {food.orders === 1 ? "pedido" : "pedidos"} · ticket promedio <b className="text-ink">{fmt(food.avgTicket)}</b>
            {food.share != null && <> · {formatPct(food.share)} de lo que gastan en comer</>}
          </p>
        </div>
        {vsAvg != null && (
          <span className={`pill ${vsAvg > 0.15 ? "pill-neg" : vsAvg < -0.1 ? "pill-pos" : ""}`}>
            {vsAvg >= 0 ? "+" : ""}{formatPct(vsAvg)} vs. promedio
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-3">
        {food.byApp.map((a) => (
          <li key={a.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-2 text-[14.5px] font-semibold">
                <span className="size-2.5 rounded-full" style={{ background: `var(--cat-${a.color})` }} />{a.name}
              </span>
              <span className="num text-[13px] text-ink-2"><b className="text-ink">{fmt(a.total)}</b> · {a.orders} {a.orders === 1 ? "pedido" : "pedidos"}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${(a.total / max) * 100}%`, background: `var(--cat-${a.color})` }} />
            </div>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-[13px] sm:grid-cols-3">
        {food.projected != null && <div><dt className="text-ink-2">Cierre estimado</dt><dd className="num text-[16px] font-bold">{fmt(food.projected)}</dd></div>}
        {food.avgMonthly != null && <div><dt className="text-ink-2">Promedio mensual</dt><dd className="num text-[16px] font-bold">{fmt(food.avgMonthly)}</dd></div>}
        <div><dt className="text-ink-2">Al año, a este ritmo</dt><dd className="num text-[16px] font-bold">{fmt(food.yearly)}</dd></div>
      </dl>
    </div>
  );
}
