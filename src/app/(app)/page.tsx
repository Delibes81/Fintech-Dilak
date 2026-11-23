"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheck, PiggyBank, Plus, ReceiptText, Repeat, ShieldCheck, Target, Users } from "lucide-react";
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
import { goalPlan } from "@/lib/finance/engine";
import { monthName } from "@/lib/dates";
import { formatPct } from "@/lib/money";

export default function Inicio() {
  const hh = useHousehold();
  const { openNewTx } = useUi();
  const { loading, report: r, health, tips } = useReport();
  const txs = hh.months[hh.ym] ?? [];

  const firstName = hh.me?.display_name?.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="rise">
        <p className="text-[14px] text-ink-2">{greeting}{firstName ? `, ${firstName}` : ""}</p>
        <h1 className="font-display text-[26px] font-extrabold tracking-tight">
          {r.phase === "current" ? "Así vienen este mes" : r.phase === "past" ? `Cómo cerró ${monthName(hh.ym)}` : `Lo que viene en ${monthName(hh.ym)}`}
        </h1>
      </div>

      {hero(loading)}

      {onboarding()}

      {tips.length > 0 && (
        <Section title="Para tener en cuenta" aside={tips.length > 3 ? <Link href="/analisis" className="text-accent">Ver {tips.length}</Link> : undefined} card={false}>
          <InsightList items={tips.slice(0, 3)} compact />
        </Section>
      )}

      <Section title={r.phase === "past" ? "Fijos del mes" : "Fijos por pagar"} aside={<Link href="/plan" className="text-accent">Editar</Link>}>
        {hh.recurring.length === 0 ? (
          <Empty title="Carguen sus fijos una sola vez" icon={<Repeat size={22} />}
            action={<Link href="/plan" className="btn btn-soft">Agregar fijos</Link>}>
            Alquiler, servicios, suscripciones y cuotas. Después cada mes los marcan como pagados con un toque y la app avisa lo que vence.
          </Empty>
        ) : r.due.length === 0 ? (
          <p className="py-3 text-center text-[14px] text-ink-2">No hay fijos que venzan en {monthName(hh.ym)}.</p>
        ) : (
          <DueList items={r.due} ym={hh.ym} />
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        {budgetsCard()}
        {goalsCard()}
      </div>

      <Section title="Últimos movimientos" aside={txs.length > 0 ? <Link href="/movimientos" className="text-accent">Ver todos</Link> : undefined}>
        {loading ? (
          <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
        ) : txs.length === 0 ? (
          <Empty title={`Sin movimientos en ${monthName(hh.ym)}`} icon={<ReceiptText size={22} />}
            action={<button type="button" className="btn btn-primary" onClick={() => openNewTx()}><Plus size={18} /> Cargar el primero</button>}>
            Tocá el botón <b>+</b>, escribí el monto y elegí la categoría. Son dos toques.
          </Empty>
        ) : (
          <div className="-mx-2 flex flex-col">{txs.slice(0, 6).map((t) => <TxRow key={t.id} tx={t} showDate />)}</div>
        )}
      </Section>
    </div>
  );

  /* ------------------------------ Bloques ------------------------------ */

  function hero(loading: boolean) {
    if (loading) return <div className="skeleton h-[230px] rounded-[26px]" />;
    const spentPct = r.expectedIncome > 0 ? r.consumption / r.expectedIncome : 0;
    const monthPct = r.daysInMonth ? r.elapsedDays / r.daysInMonth : 0;
    const noIncome = r.expectedIncome <= 0;

    return (
      <section className="hero rise relative overflow-hidden p-5 sm:p-6" aria-label="Resumen del mes">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            {r.phase === "current" && !noIncome ? (
              <>
                <p className="text-[13px] font-semibold tracking-wide text-white/70 uppercase">Disponible para gastar</p>
                <p className="num mt-1 font-display text-[clamp(32px,10vw,46px)] leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap">
                  {hh.fmt(Math.max(0, Math.floor(r.perDay ?? 0)))}<span className="ml-1.5 text-[17px] font-bold text-white/60">por día</span>
                </p>
                <p className="mt-2 text-[14px] text-white/75">
                  {r.safeToSpend >= 0
                    ? <>Quedan <b className="text-white">{hh.fmt(r.safeToSpend)}</b> para {r.daysLeft} {r.daysLeft === 1 ? "día" : "días"}, ya descontando fijos y ahorro.</>
                    : <>Se pasaron <b className="text-white">{hh.fmt(-r.safeToSpend)}</b> de lo que permite su ingreso. Conviene frenar los gastos que no sean esenciales.</>}
                </p>
              </>
            ) : r.phase === "past" ? (
              <>
                <p className="text-[13px] font-semibold tracking-wide text-white/70 uppercase">Resultado del mes</p>
                <p className="num mt-1 font-display text-[44px] leading-none font-extrabold tracking-[-0.03em]">{hh.fmt(r.income - r.consumption, { sign: r.income - r.consumption !== 0 })}</p>
                <p className="mt-2 text-[14px] text-white/75">
                  {r.savingsRate != null ? <>Ahorraron el <b className="text-white">{formatPct(Math.max(0, r.savingsRate))}</b> de lo que entró.</> : "No hubo ingresos cargados."}
                </p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold tracking-wide text-white/70 uppercase">{r.phase === "future" ? "Fijos previstos" : "Empecemos"}</p>
                <p className="num mt-1 font-display text-[40px] leading-none font-extrabold tracking-[-0.03em]">
                  {r.phase === "future" ? hh.fmt(r.pendingFixed) : hh.fmt(r.consumption)}
                </p>
                <p className="mt-2 text-[14px] text-white/75">
                  {r.phase === "future" ? "Es lo que ya está comprometido para ese mes." : "Carguen el ingreso del mes (sueldo) para calcular cuánto pueden gastar por día."}
                </p>
                {r.phase === "current" && (
                  <button type="button" className="btn btn-sm mt-3 border-white/20 bg-white/15 text-white" onClick={() => openNewTx({ kind: "income" })}>
                    <Plus size={16} /> Cargar ingreso
                  </button>
                )}
              </>
            )}
          </div>
          <Link href="/analisis" className="shrink-0 text-center" aria-label="Ver salud financiera">
            <ScoreRing score={health.score} size={66} onDark />
            <span className="mt-1 block text-[11px] font-semibold text-white/70">Salud</span>
          </Link>
        </div>

        {!noIncome && (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-[12.5px] text-white/70">
              <span>Gastado {formatPct(Math.min(spentPct, 9.99))} del ingreso</span>
              {r.phase === "current" && <span>Mes transcurrido {formatPct(monthPct)}</span>}
            </div>
            <div className="relative h-2 rounded-full bg-white/15">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, spentPct * 100)}%`, background: spentPct > monthPct + 0.1 && r.phase === "current" ? "#ffb4a8" : "#fff" }} />
              {r.phase === "current" && <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-white/80" style={{ left: `${monthPct * 100}%` }} aria-hidden="true" />}
            </div>
          </div>
        )}

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/15 pt-4 [&_dd]:truncate [&_dd]:text-[clamp(13.5px,4vw,17px)]">
          <div className="min-w-0"><dt className="text-[12px] text-white/65">Ingresos{r.incomeIsEstimate ? "*" : ""}</dt><dd className="num font-display font-bold">{hh.fmt(r.phase === "past" ? r.income : r.expectedIncome)}</dd></div>
          <div className="min-w-0"><dt className="text-[12px] text-white/65">Gastos</dt><dd className="num font-display font-bold">{hh.fmt(r.consumption)}</dd></div>
          <div className="min-w-0"><dt className="truncate text-[12px] text-white/65">{r.phase === "current" ? "Cierre estimado" : "Ahorrado"}</dt>
            <dd className={`num font-display font-bold ${r.phase === "current" && r.projectedBalance < 0 ? "text-[#ffb4a8]" : ""}`}>
              {r.phase === "current" ? hh.fmt(r.projectedBalance) : hh.fmt(r.saved)}
            </dd></div>
        </dl>
        {r.incomeIsEstimate && <p className="mt-2 text-[11.5px] text-white/55">* Ingreso estimado con el promedio de los últimos meses hasta que carguen el de este mes.</p>}
      </section>
    );
  }

  function budgetsCard() {
    const lines = r.byCategory.filter((l) => (l.budget ?? 0) > 0).sort((a, b) => b.spent / (b.budget || 1) - a.spent / (a.budget || 1)).slice(0, 4);
    const monthPct = r.daysInMonth ? r.elapsedDays / r.daysInMonth : 1;
    return (
      <Section title="Presupuestos" aside={<Link href="/plan" className="text-accent">{lines.length ? "Ajustar" : "Definir"}</Link>}>
        {lines.length === 0 ? (
          <Empty title="Pongan un techo por categoría" icon={<Target size={22} />}
            action={<Link href="/plan" className="btn btn-soft">Armar presupuesto</Link>}>
            La app puede sugerirlo con lo que gastaron los últimos meses.
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {lines.map((l) => {
              const over = l.spent > (l.budget ?? 0);
              const ahead = l.spent / (l.budget || 1) > monthPct + 0.1;
              return (
                <li key={l.category.id} className="flex items-center gap-3">
                  <CategoryIcon category={l.category} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-semibold">{l.category.name}</span>
                      <span className="num shrink-0 text-[13px] text-ink-2"><b className={over ? "text-neg" : "text-ink"}>{hh.fmt(l.spent)}</b> / {hh.fmt(l.budget ?? 0)}</span>
                    </div>
                    <Progress value={l.spent} max={l.budget ?? 0} tone={over ? "neg" : ahead ? "warn" : "accent"} marker={r.phase === "current" ? (l.budget ?? 0) * monthPct : undefined} height={7} label={`Presupuesto de ${l.category.name}`} />
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
    const goals = hh.goals.filter((g) => !g.archived).sort((a, b) => (a.kind === "emergency" ? -1 : 1) - (b.kind === "emergency" ? -1 : 1)).slice(0, 3);
    return (
      <Section title="Metas de ahorro" aside={<Link href="/plan?tab=metas" className="text-accent">{goals.length ? "Ver" : "Crear"}</Link>}>
        {goals.length === 0 ? (
          <Empty title="Empiecen por el fondo de emergencia" icon={<ShieldCheck size={22} />}
            action={<Link href="/plan?tab=metas" className="btn btn-soft">Crear meta</Link>}>
            Entre 3 y 6 meses de gastos esenciales, guardados aparte. Es lo que los protege de un imprevisto.
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {goals.map((g) => {
              const p = goalPlan(g, hh.today);
              return (
                <li key={g.id} className="flex items-center gap-3">
                  <span className="grid size-[34px] shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    {g.kind === "emergency" ? <ShieldCheck size={18} /> : <PiggyBank size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-semibold">{g.name}</span>
                      <span className="num shrink-0 text-[13px] text-ink-2">{formatPct(p.progress)}</span>
                    </div>
                    <Progress value={g.saved_amount} max={g.target_amount} tone="pos" height={7} label={`Progreso de ${g.name}`} />
                    {p.monthly != null && p.remaining > 0 && <p className="mt-1 text-[12px] text-ink-3">Aportando {hh.fmt(Math.ceil(p.monthly))} por mes llegan a tiempo</p>}
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
      { done: curTx.some((t) => t.kind === "income"), label: "Cargar el ingreso del mes", hint: "Con eso calculamos cuánto pueden gastar", onClick: () => openNewTx({ kind: "income" }), icon: PiggyBank },
      { done: hh.goals.some((g) => g.kind === "emergency"), label: "Crear el fondo de emergencia", hint: "La base de unas finanzas sanas", href: "/plan?tab=metas", icon: ShieldCheck },
      { done: hh.members.length > 1, label: "Sumar a tu pareja", hint: "Comparten la misma libreta en tiempo real", href: "/ajustes", icon: Users },
    ];
    const pending = steps.filter((s) => !s.done);
    if (!pending.length || hh.ym !== hh.today.slice(0, 7)) return null;
    return (
      <Section title="Primeros pasos" aside={`${steps.length - pending.length} de ${steps.length}`}>
        <ul className="flex flex-col">
          {steps.map((s) => {
            const Icon = s.icon;
            const inner = (
              <>
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${s.done ? "bg-pos-soft text-pos" : "bg-surface-2 text-ink-2"}`}>
                  {s.done ? <CircleCheck size={18} /> : <Icon size={18} />}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className={`block font-semibold ${s.done ? "text-ink-3 line-through" : ""}`}>{s.label}</span>
                  {!s.done && <span className="block text-[13px] text-ink-2">{s.hint}</span>}
                </span>
                {!s.done && <ArrowRight size={17} className="shrink-0 text-ink-3" />}
              </>
            );
            const cls = "flex w-full items-center gap-3 border-t border-line/70 py-2.5 first:border-t-0";
            if (s.done) return <li key={s.label} className={cls}>{inner}</li>;
            return (
              <li key={s.label}>
                {s.href ? <Link href={s.href} className={cls}>{inner}</Link> : <button type="button" onClick={s.onClick} className={cls}>{inner}</button>}
              </li>
            );
          })}
        </ul>
      </Section>
    );
  }
}
