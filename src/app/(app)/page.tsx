"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarClock, CircleCheck, PiggyBank, Plus, ReceiptText, Repeat, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useHousehold } from "@/store/household";
import { useUi } from "@/store/ui";
import { useReport } from "@/hooks/useReport";
import { Section } from "@/components/ui/Section";
import { Progress } from "@/components/ui/Progress";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Empty } from "@/components/ui/Empty";
import { InsightList } from "@/components/insights/InsightList";
import { DueList } from "@/components/fijos/DueList";
import { TxRow } from "@/components/tx/TxList";
import { SpendChart } from "@/components/charts/SpendChart";
import { NumberTicker } from "@/components/motion/NumberTicker";
import { Reveal, RevealItem } from "@/components/motion/Reveal";
import { PageTransition } from "@/components/motion/PageTransition";
import { SpotlightCard } from "@/components/motion/Spotlight";
import { goalPlan } from "@/lib/finance/engine";
import { monthName } from "@/lib/dates";
import { formatPct } from "@/lib/money";
import { cn } from "@/lib/cn";

export default function Inicio() {
  const hh = useHousehold();
  const { openNewTx } = useUi();
  const { loading, report: r, health, tips } = useReport();
  const txs = hh.months[hh.ym] ?? [];
  const consumption = txs.filter((t) => t.kind === "expense" && hh.categories.find((c) => c.id === t.category_id)?.bucket !== "saving");

  const firstName = hh.me?.display_name?.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const rate = r.phase === "past" ? r.savingsRate : r.projectedSavingsRate;
  const pendingCount = r.due.filter((d) => d.status !== "paid").length;

  return (
    <PageTransition>
      <Reveal className="flex flex-col gap-4 pt-2 md:gap-5">
        <RevealItem className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{greeting}{firstName ? `, ${firstName}` : ""}</p>
            <h1 className="mt-1 text-[28px] leading-tight font-semibold md:text-[32px]">
              {r.phase === "current" ? <>Así viene <span className="text-gradient">{monthName(hh.ym)}</span></> : r.phase === "past" ? <>Cierre de <span className="text-gradient">{monthName(hh.ym)}</span></> : <>Lo que viene en <span className="text-gradient">{monthName(hh.ym)}</span></>}
            </h1>
          </div>
        </RevealItem>

        {/* Fila 1: tarjeta principal + salud */}
        <div className="grid gap-4 md:grid-cols-12 md:gap-5">
          <RevealItem className="md:col-span-8">{hero()}</RevealItem>
          <RevealItem className="md:col-span-4">
            <Link href="/analisis" className="block h-full">
              <SpotlightCard className="flex h-full flex-col p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Salud financiera</p>
                  <ArrowUpRight size={16} className="text-ink-3" />
                </div>
                <div className="my-4 flex items-center gap-4">
                  <ScoreRing score={health.score} size={88} stroke={8} />
                  <div className="min-w-0">
                    <p className="text-[22px] font-semibold tracking-tight">{health.score == null ? "Sin datos" : health.score >= 70 ? "Sólida" : health.score >= 45 ? "Mejorable" : "En riesgo"}</p>
                    <p className="text-[13px] text-ink-2">{health.score == null ? "Cargá el ingreso del mes" : "de 100 puntos"}</p>
                  </div>
                </div>
                <ul className="mt-auto flex flex-col gap-2.5">
                  {health.parts.map((p) => (
                    <li key={p.key}>
                      <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-ink-2">{p.label}</span><span className="num text-ink-3">{Math.round(p.points)}/{p.max}</span></div>
                      <Progress value={p.points} max={p.max} tone={p.points / p.max >= 0.7 ? "pos" : p.points / p.max >= 0.4 ? "warn" : "neg"} height={4} label={p.label} />
                    </li>
                  ))}
                </ul>
              </SpotlightCard>
            </Link>
          </RevealItem>
        </div>

        {/* Fila 2: indicadores */}
        <RevealItem className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          <Kpi fmt={hh.fmt} label="Ingresos" value={r.phase === "past" ? r.income : r.expectedIncome} tone="pos" sub={r.incomeIsEstimate ? "estimado (promedio)" : `${txs.filter((t) => t.kind === "income").length} cargados`} />
          <Kpi fmt={hh.fmt} label="Gastos" value={r.consumption} tone="neg" sub={r.avgConsumption3 ? `prom. ${hh.fmt(r.avgConsumption3)}` : `${consumption.length} cargados`} />
          <Kpi fmt={hh.fmt} label={r.phase === "current" ? "Ahorro proyectado" : "Tasa de ahorro"} pct={rate} sub={`meta ${hh.household.savings_target_pct}%`}
            tone={rate != null && rate * 100 >= hh.household.savings_target_pct ? "pos" : rate != null && rate < 0 ? "neg" : undefined} />
          <Kpi fmt={hh.fmt} label="Fijos pendientes" value={r.pendingFixed} sub={`${pendingCount} por pagar`} tone={r.due.some((d) => d.status === "overdue") ? "neg" : undefined} />
        </RevealItem>

        {onboarding()}

        {/* Fila 3: consejos + fijos */}
        <div className="grid gap-4 md:grid-cols-12 md:gap-5">
          {tips.length > 0 && (
            <RevealItem className="md:col-span-5">
              <Section eyebrow="Asesor" title="Para tener en cuenta" aside={tips.length > 3 ? <Link href="/analisis" className="text-accent">Ver {tips.length}</Link> : undefined} className="h-full">
                <InsightList items={tips.slice(0, 3)} compact />
              </Section>
            </RevealItem>
          )}
          <RevealItem className={tips.length > 0 ? "md:col-span-7" : "md:col-span-12"}>
            <Section eyebrow="Compromisos" title={r.phase === "past" ? "Fijos del mes" : "Fijos por pagar"} aside={<Link href="/plan" className="text-accent">Editar</Link>} className="h-full">
              {hh.recurring.length === 0 ? (
                <Empty title="Cargá tus fijos una sola vez" icon={<Repeat size={22} />}
                  action={<Link href="/plan" className="btn btn-soft">Agregar fijos</Link>}>
                  Alquiler, servicios, suscripciones y cuotas. Después cada mes se marcan con un toque y Dilak avisa lo que vence.
                </Empty>
              ) : r.due.length === 0 ? (
                <p className="py-3 text-center text-[14px] text-ink-2">No hay fijos que venzan en {monthName(hh.ym)}.</p>
              ) : (
                <DueList items={r.due} ym={hh.ym} />
              )}
            </Section>
          </RevealItem>
        </div>

        {/* Fila 4: presupuestos + metas */}
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <RevealItem>{budgetsCard()}</RevealItem>
          <RevealItem>{goalsCard()}</RevealItem>
        </div>

        <RevealItem>
          <Section eyebrow="Actividad" title="Últimos movimientos" aside={txs.length > 0 ? <Link href="/movimientos" className="text-accent" transitionTypes={["nav-forward"]}>Ver todos</Link> : undefined}>
            {loading ? (
              <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
            ) : txs.length === 0 ? (
              <Empty title={`Sin movimientos en ${monthName(hh.ym)}`} icon={<ReceiptText size={22} />}
                action={<button type="button" className="btn btn-primary" onClick={() => openNewTx()}><Plus size={18} /> Cargar el primero</button>}>
                Tocá <b>+</b>, escribí el monto y elegí la categoría. Son dos toques.
              </Empty>
            ) : (
              <div className="-mx-2 grid md:grid-cols-2 md:gap-x-4">{txs.slice(0, 8).map((t, i) => <TxRow key={t.id} tx={t} showDate index={i} />)}</div>
            )}
          </Section>
        </RevealItem>
      </Reveal>
    </PageTransition>
  );

  /* ------------------------------ Bloques ------------------------------ */

  function hero() {
    if (loading) return <div className="skeleton h-[300px] rounded-[26px]" />;
    const noIncome = r.expectedIncome <= 0;
    const monthBudget = Math.max(0, r.expectedIncome - r.savingsGoal);
    return (
      <section className="hero beam h-full p-5 sm:p-6" aria-label="Resumen del mes">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {r.phase === "current" && !noIncome ? (
              <>
                <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] text-white/60 uppercase">
                  <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#7ee8ff] opacity-70" /><span className="relative inline-flex size-1.5 rounded-full bg-[#7ee8ff]" /></span>
                  Disponible para gastar hoy
                </p>
                <p className="mt-2 flex items-baseline gap-2 whitespace-nowrap">
                  <NumberTicker value={Math.max(0, Math.floor(r.perDay ?? 0))} format={hh.fmt} className="num text-[clamp(34px,10vw,52px)] leading-none font-semibold tracking-[-0.05em]" />
                  <span className="text-[14px] text-white/55">/ día</span>
                </p>
                <p className="mt-2 max-w-[44ch] text-[13.5px] text-white/70">
                  {r.safeToSpend >= 0
                    ? <>Quedan <b className="num font-semibold text-white">{hh.fmt(r.safeToSpend)}</b> para {r.daysLeft} {r.daysLeft === 1 ? "día" : "días"}, ya descontando fijos y ahorro.</>
                    : <>Se pasaron <b className="num font-semibold text-white">{hh.fmt(-r.safeToSpend)}</b> de lo que permite el ingreso. Frená los gastos no esenciales.</>}
                </p>
              </>
            ) : r.phase === "past" ? (
              <>
                <p className="font-mono text-[10.5px] tracking-[0.14em] text-white/60 uppercase">Resultado del mes</p>
                <NumberTicker value={r.income - r.consumption} format={(n) => hh.fmt(n, { sign: Math.round(n) !== 0 })} className="num mt-2 block text-[clamp(34px,10vw,52px)] leading-none font-semibold tracking-[-0.05em]" />
                <p className="mt-2 text-[13.5px] text-white/70">{r.savingsRate != null ? <>Ahorraron el <b className="text-white">{formatPct(Math.max(0, r.savingsRate))}</b> de lo que entró.</> : "No hubo ingresos cargados."}</p>
              </>
            ) : (
              <>
                <p className="font-mono text-[10.5px] tracking-[0.14em] text-white/60 uppercase">{r.phase === "future" ? "Fijos previstos" : "Empecemos"}</p>
                <NumberTicker value={r.phase === "future" ? r.pendingFixed : r.consumption} format={hh.fmt} className="num mt-2 block text-[clamp(32px,9vw,46px)] leading-none font-semibold tracking-[-0.05em]" />
                <p className="mt-2 max-w-[44ch] text-[13.5px] text-white/70">
                  {r.phase === "future" ? "Es lo que ya está comprometido para ese mes." : "Cargá el ingreso del mes (sueldo) y Dilak calcula cuánto pueden gastar por día."}
                </p>
                {r.phase === "current" && (
                  <button type="button" className="btn btn-sm mt-3 border-white/20 bg-white/10 text-white hover:!bg-white/20" onClick={() => openNewTx({ kind: "income" })}>
                    <Plus size={16} /> Cargar ingreso
                  </button>
                )}
              </>
            )}
          </div>
          {r.phase === "current" && !noIncome && (
            <span className={cn("shrink-0 rounded-full border px-2.5 py-1 font-mono text-[11px]", r.projectedBalance < 0 ? "border-[#ff6b85]/40 bg-[#ff6b85]/15 text-[#ffc2cc]" : "border-[#34e0a1]/30 bg-[#34e0a1]/10 text-[#a6f5d4]")}>
              {r.projectedBalance < 0 ? "Déficit" : "En curso"}
            </span>
          )}
        </div>

        {r.phase !== "future" && consumption.length > 0 && (
          <div className="mt-4">
            <SpendChart txs={consumption} ym={hh.ym} daysInMonth={r.daysInMonth} elapsedDays={r.elapsedDays} monthBudget={monthBudget} fmt={hh.fmt} />
          </div>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
          {[
            { k: `Ingresos${r.incomeIsEstimate ? "*" : ""}`, v: r.phase === "past" ? r.income : r.expectedIncome, c: "" },
            { k: "Gastado", v: r.consumption, c: "" },
            { k: r.phase === "current" ? "Cierre estimado" : "Ahorrado", v: r.phase === "current" ? r.projectedBalance : r.saved, c: r.phase === "current" && r.projectedBalance < 0 ? "text-[#ffb4c0]" : "text-[#a6f5d4]" },
          ].map((s) => (
            <div key={s.k} className="min-w-0">
              <dt className="truncate font-mono text-[10px] tracking-[0.12em] text-white/50 uppercase">{s.k}</dt>
              <dd className={cn("num mt-1 truncate text-[clamp(13px,3.8vw,17px)] font-semibold", s.c)}>{hh.fmt(s.v)}</dd>
            </div>
          ))}
        </dl>
        {r.incomeIsEstimate && <p className="mt-2 text-[11px] text-white/45">* Estimado con el promedio de los últimos meses hasta que carguen el ingreso.</p>}
      </section>
    );
  }

  function budgetsCard() {
    const lines = r.byCategory.filter((l) => (l.budget ?? 0) > 0).sort((a, b) => b.spent / (b.budget || 1) - a.spent / (a.budget || 1)).slice(0, 4);
    const monthPct = r.daysInMonth ? r.elapsedDays / r.daysInMonth : 1;
    return (
      <Section eyebrow="Control" title="Presupuestos" aside={<Link href="/plan?tab=presupuestos" className="text-accent">{lines.length ? "Ajustar" : "Definir"}</Link>} className="h-full">
        {lines.length === 0 ? (
          <Empty title="Poné un techo por categoría" icon={<Target size={22} />} action={<Link href="/plan?tab=presupuestos" className="btn btn-soft">Armar presupuesto</Link>}>
            Dilak lo sugiere con lo que gastaron en los últimos meses.
          </Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {lines.map((l) => {
              const over = l.spent > (l.budget ?? 0);
              const ahead = l.spent / (l.budget || 1) > monthPct + 0.1;
              return (
                <li key={l.category.id} className="flex items-center gap-3">
                  <CategoryIcon category={l.category} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-medium">{l.category.name}</span>
                      <span className="num shrink-0 text-[12.5px] text-ink-3"><b className={cn("font-semibold", over ? "text-neg" : "text-ink")}>{hh.fmt(l.spent)}</b> / {hh.fmt(l.budget ?? 0)}</span>
                    </div>
                    <Progress value={l.spent} max={l.budget ?? 0} tone={over ? "neg" : ahead ? "warn" : "accent"} marker={r.phase === "current" ? (l.budget ?? 0) * monthPct : undefined} height={6} label={`Presupuesto de ${l.category.name}`} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    );
  }

  function goalsCard() {
    const goals = hh.goals.filter((g) => !g.archived).sort((a, b) => Number(b.kind === "emergency") - Number(a.kind === "emergency")).slice(0, 3);
    return (
      <Section eyebrow="Futuro" title="Metas de ahorro" aside={<Link href="/plan?tab=metas" className="text-accent">{goals.length ? "Ver" : "Crear"}</Link>} className="h-full">
        {goals.length === 0 ? (
          <Empty title="Empezá por el fondo de emergencia" icon={<ShieldCheck size={22} />} action={<Link href="/plan?tab=metas" className="btn btn-soft">Crear meta</Link>}>
            Entre 3 y 6 meses de gastos esenciales, guardados aparte. Es lo que te protege de un imprevisto.
          </Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {goals.map((g) => {
              const p = goalPlan(g, hh.today);
              return (
                <li key={g.id} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-accent">
                    {g.kind === "emergency" ? <ShieldCheck size={18} /> : <PiggyBank size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-medium">{g.name}</span>
                      <span className="num shrink-0 text-[12.5px] text-ink-2">{formatPct(p.progress)}</span>
                    </div>
                    <Progress value={g.saved_amount} max={g.target_amount} tone="pos" height={6} label={`Progreso de ${g.name}`} />
                    {p.monthly != null && p.remaining > 0 && <p className="mt-1.5 text-[12px] text-ink-3">Aportando <span className="num">{hh.fmt(Math.ceil(p.monthly))}</span>/mes llegan a tiempo</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    );
  }

  function onboarding() {
    const curTx = hh.months[hh.today.slice(0, 7)] ?? [];
    const steps = [
      { done: hh.recurring.length > 0, label: "Cargar los gastos fijos", hint: "Alquiler, servicios, suscripciones", href: "/plan", icon: CalendarClock },
      { done: curTx.some((t) => t.kind === "income"), label: "Cargar el ingreso del mes", hint: "Con eso se calcula cuánto pueden gastar", onClick: () => openNewTx({ kind: "income" }), icon: PiggyBank },
      { done: hh.goals.some((g) => g.kind === "emergency"), label: "Crear el fondo de emergencia", hint: "La base de unas finanzas sanas", href: "/plan?tab=metas", icon: ShieldCheck },
    ];
    const done = steps.filter((s) => s.done).length;
    if (done === steps.length || hh.ym !== hh.today.slice(0, 7)) return null;
    return (
      <RevealItem>
        <Section eyebrow="Configuración" title={<span className="flex items-center gap-2"><Sparkles size={16} className="text-accent" /> Primeros pasos</span>} aside={<span className="num">{done}/{steps.length}</span>}>
          <div className="mb-3"><Progress value={done} max={steps.length} height={4} label="Progreso de configuración" /></div>
          <ul className="grid gap-1 md:grid-cols-3 md:gap-x-4">
            {steps.map((s) => {
              const Icon = s.icon;
              const inner = (
                <>
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl border", s.done ? "border-transparent bg-pos-soft text-pos" : "border-line bg-surface-2 text-ink-2")}>
                    {s.done ? <CircleCheck size={18} /> : <Icon size={18} />}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className={cn("block text-[14px] font-medium", s.done && "text-ink-3 line-through")}>{s.label}</span>
                    {!s.done && <span className="block text-[12.5px] text-ink-3">{s.hint}</span>}
                  </span>
                  {!s.done && <ArrowRight size={16} className="shrink-0 text-ink-3" />}
                </>
              );
              const cls = "flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2";
              if (s.done) return <li key={s.label} className={cls}>{inner}</li>;
              return <li key={s.label}>{s.href ? <Link href={s.href} className={cls}>{inner}</Link> : <button type="button" onClick={s.onClick} className={cls}>{inner}</button>}</li>;
            })}
          </ul>
        </Section>
      </RevealItem>
    );
  }
}

function Kpi({ label, value, pct, sub, tone, fmt }: { label: string; value?: number; pct?: number | null; sub?: string; tone?: "pos" | "neg"; fmt: (n: number) => string }) {
  return (
    <SpotlightCard className="p-4">
      <p className="eyebrow">{label}</p>
      <p className={cn("num mt-2 truncate text-[clamp(18px,5vw,24px)] leading-none font-semibold", tone === "pos" && "text-pos", tone === "neg" && "text-neg")}>
        {pct !== undefined
          ? (pct == null ? "–" : <NumberTicker value={Math.max(-9.99, pct) * 100} format={(n) => `${Math.round(n)}%`} />)
          : <NumberTicker value={value ?? 0} format={fmt} />}
      </p>
      {sub && <p className="mt-1.5 truncate text-[12px] text-ink-3">{sub}</p>}
    </SpotlightCard>
  );
}
