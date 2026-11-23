"use client";

import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal, RevealItem } from "@/components/motion/Reveal";
import { Segmented } from "@/components/ui/Segmented";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PiggyBank, Plus, Repeat, ShieldCheck, Sparkles, Target, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useHousehold } from "@/store/household";
import { useReport } from "@/hooks/useReport";
import { Section } from "@/components/ui/Section";
import { Empty } from "@/components/ui/Empty";
import { Progress } from "@/components/ui/Progress";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { RecurringSheet, type RecurringDraft } from "@/components/fijos/RecurringSheet";
import { GoalSheet, type GoalDraft } from "@/components/plan/GoalSheet";
import { AmountSheet } from "@/components/plan/AmountSheet";
import { emergencyMonths, goalPlan, monthlyEquivalent, roundNice, suggestBudgets } from "@/lib/finance/engine";
import { MONTHS, dayLabel } from "@/lib/dates";
import { formatCompact, formatPct, parseAmount } from "@/lib/money";
import type { Bucket, Goal } from "@/lib/types";

type Tab = "fijos" | "presupuestos" | "metas";
const TABS: { id: Tab; label: string; icon: typeof Repeat }[] = [
  { id: "fijos", label: "Fijos", icon: Repeat },
  { id: "presupuestos", label: "Presupuestos", icon: Target },
  { id: "metas", label: "Metas", icon: PiggyBank },
];

const TEMPLATES: { name: string; icon: string }[] = [
  { name: "Alquiler", icon: "home" }, { name: "Expensas", icon: "home" }, { name: "Luz", icon: "zap" }, { name: "Gas", icon: "zap" },
  { name: "Agua", icon: "zap" }, { name: "Internet", icon: "zap" }, { name: "Celular", icon: "zap" }, { name: "Prepaga", icon: "heart" },
  { name: "Seguro del auto", icon: "zap" }, { name: "Colegio", icon: "graduation" }, { name: "Tarjeta de crédito", icon: "card" },
  { name: "Gimnasio", icon: "repeat" }, { name: "Netflix", icon: "repeat" }, { name: "Spotify", icon: "repeat" },
  { name: "Disney+", icon: "repeat" }, { name: "Max", icon: "repeat" }, { name: "YouTube Premium", icon: "repeat" }, { name: "iCloud", icon: "repeat" },
];

const BUCKET_LABEL: Record<Bucket, string> = { need: "Necesidad", want: "Deseo", saving: "Ahorro" };

export default function Plan() {
  const [tab, setTab] = useState<Tab>(() => {
    const t = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab");
    return TABS.some((x) => x.id === t) ? (t as Tab) : "fijos";
  });

  return (
    <PageTransition>
    <Reveal className="flex flex-col gap-4 pt-2 md:gap-5">
      <RevealItem>
        <p className="eyebrow">Planificación</p>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold md:text-[32px]">Plan <span className="text-gradient">financiero</span></h1>
        <p className="mt-1 text-[14px] text-ink-2">Lo que se repite, cuánto quieren gastar y para qué están ahorrando.</p>
      </RevealItem>
      <RevealItem className="md:max-w-[520px]">
        <Segmented full label="Sección" value={tab} onChange={setTab}
          options={TABS.map(({ id, label, icon: Icon }) => ({ value: id, label: <><Icon size={15} className="max-[380px]:hidden" /> {label}</> }))} />
      </RevealItem>
      <RevealItem className="flex flex-col gap-4 md:gap-5">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} className="flex flex-col gap-4 md:gap-5"
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
          {tab === "fijos" && <FijosTab />}
          {tab === "presupuestos" && <PresupuestosTab />}
          {tab === "metas" && <MetasTab />}
        </motion.div>
      </AnimatePresence>
      </RevealItem>
    </Reveal>
    </PageTransition>
  );
}

/* --------------------------------- Fijos --------------------------------- */

function FijosTab() {
  const hh = useHousehold();
  const { report: r } = useReport();
  const [draft, setDraft] = useState<RecurringDraft | null>(null);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const edit = (d: RecurringDraft) => { setDraft(d); setKey((k) => k + 1); setOpen(true); };

  const have = new Set(hh.recurring.map((x) => x.name.toLowerCase()));
  const templates = TEMPLATES.filter((t) => !have.has(t.name.toLowerCase()));
  const catFor = (icon: string) => hh.categories.find((c) => c.icon === icon && c.kind === "expense" && !c.archived)?.id ?? null;
  const monthly = hh.recurring.filter((x) => x.frequency === "monthly").sort((a, b) => a.due_day - b.due_day);
  const yearly = hh.recurring.filter((x) => x.frequency === "yearly").sort((a, b) => (a.due_month ?? 0) - (b.due_month ?? 0));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="eyebrow">Fijos por mes</p><p className="num mt-1 text-[22px] font-bold">{hh.fmt(r.monthlyFixed)}</p>
          <p className="text-[12.5px] text-ink-2">{hh.recurring.filter((x) => x.active).length} activos · anuales prorrateados</p></div>
        <div className="card p-4"><p className="eyebrow">Peso sobre ingresos</p>
          <p className={`num mt-1 text-[22px] font-bold ${r.fixedRatio != null && r.fixedRatio > 0.5 ? "text-warn" : ""}`}>{r.fixedRatio != null ? formatPct(r.fixedRatio) : "–"}</p>
          <p className="text-[12.5px] text-ink-2">Lo sano: hasta 50%</p></div>
        <div className="card col-span-2 p-4 sm:col-span-1"><p className="eyebrow">Suscripciones</p><p className="num mt-1 text-[22px] font-bold">{hh.fmt(r.subscriptionsMonthly * 12)}<span className="text-[13px] font-semibold text-ink-3"> /año</span></p>
          <p className="text-[12.5px] text-ink-2">{r.subscriptionsCount} activas · {hh.fmt(r.subscriptionsMonthly)} por mes</p></div>
      </div>

      <Section title="Agregar rápido" aside={<button type="button" className="btn btn-sm btn-soft" onClick={() => edit({})}><Plus size={16} /> Otro</button>}>
        {templates.length ? (
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button key={t.name} type="button" className="chip h-10" onClick={() => edit({ name: t.name, category_id: catFor(t.icon) })}>
                <Plus size={15} className="text-ink-3" /> {t.name}
              </button>
            ))}
          </div>
        ) : <p className="text-[14px] text-ink-2">Ya cargaron todos los comunes. Usen “Otro” para el resto.</p>}
      </Section>

      <Section title="Todos los meses" aside={monthly.length ? hh.fmt(monthly.filter((x) => x.active).reduce((a, x) => a + x.amount, 0)) : undefined}>
        {monthly.length === 0 ? (
          <Empty title="Todavía no hay fijos mensuales" icon={<Repeat size={22} />}>Tocá los de arriba: alquiler, luz, internet, Netflix…</Empty>
        ) : (
          <ul className="-mx-2">{monthly.map((x) => <RecRow key={x.id} id={x.id} onClick={() => edit(x)} when={`Día ${x.due_day}`} />)}</ul>
        )}
      </Section>

      {yearly.length > 0 && (
        <Section title="Una vez al año" aside={`${hh.fmt(yearly.reduce((a, x) => a + monthlyEquivalent(x), 0))} /mes`}>
          <ul className="-mx-2">{yearly.map((x) => <RecRow key={x.id} id={x.id} onClick={() => edit(x)} when={`${x.due_day} de ${MONTHS[(x.due_month ?? 1) - 1]}`} />)}</ul>
        </Section>
      )}

      <RecurringSheet key={key} open={open} onOpenChange={setOpen} draft={draft} />
    </>
  );
}

function RecRow({ id, onClick, when }: { id: string; onClick: () => void; when: string }) {
  const hh = useHousehold();
  const x = hh.recurring.find((r) => r.id === id)!;
  const c = hh.categories.find((k) => k.id === x.category_id);
  return (
    <li>
      <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-surface-2 ${x.active ? "" : "opacity-50"}`}>
        <CategoryIcon category={c} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{x.name}</span>
          <span className="block truncate text-[13px] text-ink-2">{c?.name ?? "Sin categoría"} · {when}{x.active ? "" : " · Pausado"}</span>
        </span>
        <span className="text-right">
          <span className="num block font-bold">{hh.fmt(x.amount)}</span>
          {x.frequency === "yearly" && <span className="num block text-[12px] text-ink-3">{hh.fmt(monthlyEquivalent(x))}/mes</span>}
        </span>
      </button>
    </li>
  );
}

/* ------------------------------ Presupuestos ------------------------------ */

function PresupuestosTab() {
  const hh = useHousehold();
  const { report: r } = useReport();
  const cats = useMemo(() => hh.categories.filter((c) => c.kind === "expense" && !c.archived && c.bucket !== "saving"), [hh.categories]);
  // Solo se guardan las ediciones pendientes; el resto sale de la base (y se actualiza en vivo).
  const [editedValues, setValues] = useState<Record<string, string>>({});
  const [editedBuckets, setBuckets] = useState<Record<string, Bucket>>({});
  const [saving, setSaving] = useState(false);
  const values: Record<string, string> = Object.fromEntries(cats.map((c) => [c.id, editedValues[c.id] ?? (c.monthly_budget ? String(Math.round(c.monthly_budget)) : "")]));
  const buckets: Record<string, Bucket> = Object.fromEntries(cats.map((c) => [c.id, editedBuckets[c.id] ?? ((c.bucket ?? "want") as Bucket)]));

  const avgBy = new Map(r.byCategory.map((l) => [l.category.id, l]));
  const suggestions = suggestBudgets(r);
  const hasSuggestions = Object.keys(suggestions).length > 0;
  const changed = cats.filter((c) => {
    const v = values[c.id] ? parseAmount(values[c.id]) : null;
    return (v ?? null) !== (c.monthly_budget ?? null) || buckets[c.id] !== (c.bucket ?? "want");
  });
  const total = cats.reduce((a, c) => a + (values[c.id] ? parseAmount(values[c.id]) || 0 : 0), 0);
  const income = r.expectedIncome;
  const totalBy = (b: Bucket) => cats.filter((c) => buckets[c.id] === b).reduce((a, c) => a + (values[c.id] ? parseAmount(values[c.id]) || 0 : 0), 0);

  async function saveAll() {
    setSaving(true);
    let ok = true;
    for (const c of changed) {
      const v = values[c.id] ? parseAmount(values[c.id]) : null;
      ok = (await hh.saveCategory({ ...c, monthly_budget: v != null && v > 0 ? v : null, bucket: buckets[c.id] })) && ok;
    }
    setSaving(false);
    if (ok) { setValues({}); setBuckets({}); toast.success("Presupuestos guardados"); }
  }

  return (
    <>
      <Section title="La regla 50/30/20">
        <p className="mb-3 text-[14px] text-ink-2">
          Un punto de partida probado: la mitad del ingreso para <b className="text-ink">necesidades</b>, un 30% para <b className="text-ink">deseos</b> y el 20% para <b className="text-ink">ahorro</b>. Cada categoría tiene su etiqueta; tocala para cambiarla.
        </p>
        {income > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {([["need", 0.5], ["want", 0.3], ["saving", hh.household.savings_target_pct / 100]] as const).map(([b, p]) => (
              <div key={b} className="min-w-0 rounded-2xl bg-surface-2 p-3">
                <p className="eyebrow truncate">{BUCKET_LABEL[b]}</p>
                <p className="text-[13px] font-bold text-ink-3">{formatPct(p)}</p>
                <p className="num mt-1 truncate text-[clamp(14px,4vw,17px)] font-bold">{formatCompact(roundNice(income * p), hh.household.currency)}</p>
                {b !== "saving" && <p className="num truncate text-[12px] text-ink-2">Puesto: {formatCompact(totalBy(b), hh.household.currency)}</p>}
              </div>
            ))}
          </div>
        ) : <p className="rounded-2xl bg-surface-2 p-3 text-[14px] text-ink-2">Carguen el ingreso del mes para ver los montos sugeridos.</p>}
      </Section>

      <Section title="Techo por categoría" aside={hasSuggestions ? (
        <button type="button" className="btn btn-sm btn-soft" onClick={() => { setValues((v) => ({ ...v, ...Object.fromEntries(Object.entries(suggestions).map(([k, n]) => [k, String(n)])) })); toast("Sugerencia aplicada. Revisala y guardá."); }}>
          <Wand2 size={15} /> Sugerir
        </button>
      ) : undefined}>
        {hasSuggestions && <p className="-mt-1 mb-3 text-[13px] text-ink-2"><Sparkles size={13} className="inline text-accent" /> “Sugerir” usa el promedio de los últimos 3 meses, redondeado.</p>}
        <ul className="flex flex-col">
          {cats.map((c) => {
            const l = avgBy.get(c.id);
            const b = buckets[c.id] ?? "want";
            return (
              <li key={c.id} className="flex items-center gap-3 border-t border-line/70 py-2.5 first:border-t-0">
                <CategoryIcon category={c} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <div className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                    <button type="button" onClick={() => setBuckets((s) => ({ ...s, [c.id]: b === "need" ? "want" : "need" }))}
                      className={`pill ${b === "need" ? "pill-accent" : ""}`} title="Tocá para cambiar">{BUCKET_LABEL[b]}</button>
                    {l?.avg3 ? <span className="num truncate">prom. {formatCompact(l.avg3, hh.household.currency)}</span> : null}
                  </div>
                </div>
                <input value={values[c.id] ?? ""} onChange={(e) => setValues((s) => ({ ...s, [c.id]: e.target.value }))} inputMode="decimal"
                  placeholder="Sin techo" aria-label={`Presupuesto de ${c.name}`}
                  className="num h-11 w-[112px] shrink-0 rounded-xl border border-transparent bg-surface-2 px-3 text-right font-semibold outline-none placeholder:font-normal placeholder:text-ink-3 focus:border-accent focus:bg-surface" />
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-surface-2 px-4 py-3 text-[14px]">
          <span className="text-ink-2">Total presupuestado</span>
          <span className="num font-bold">{hh.fmt(total)}{income > 0 && <span className={`ml-2 font-semibold ${total > income * 0.8 ? "text-warn" : "text-ink-3"}`}>{formatPct(total / income)} del ingreso</span>}</span>
        </div>
      </Section>

      {changed.length > 0 && (
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+92px)] z-10 md:bottom-4">
          <button type="button" className="btn btn-primary btn-lg w-full shadow-pop" disabled={saving} onClick={saveAll}>
            {saving ? "Guardando…" : `Guardar ${changed.length} ${changed.length === 1 ? "cambio" : "cambios"}`}
          </button>
        </div>
      )}
    </>
  );
}

/* --------------------------------- Metas --------------------------------- */

function MetasTab() {
  const hh = useHousehold();
  const { report: r } = useReport();
  const [draft, setDraft] = useState<GoalDraft | null>(null);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [contrib, setContrib] = useState<Goal | null>(null);
  const openGoal = (d: GoalDraft) => { setDraft(d); setKey((k) => k + 1); setOpen(true); };
  const goals = hh.goals.filter((g) => !g.archived).sort((a, b) => (a.kind === "emergency" ? -1 : 0) - (b.kind === "emergency" ? -1 : 0));
  const { fund, months } = emergencyMonths(hh.goals, r.essentialMonthly);
  const suggested = roundNice(Math.max(r.essentialMonthly, r.monthlyFixed) * 6);

  return (
    <>
      {!fund && (
        <section className="hero p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15"><ShieldCheck size={22} /></span>
            <div>
              <p className="text-[19px] font-bold">Primero, el fondo de emergencia</p>
              <p className="mt-1 text-[14px] text-white/75">
                Es plata que no se toca salvo imprevistos: una enfermedad, quedarse sin trabajo, un arreglo urgente. La recomendación es juntar entre 3 y 6 meses de gastos esenciales{suggested > 0 ? <>: para ustedes, unos <b className="text-white">{hh.fmt(suggested)}</b></> : ""}.
              </p>
              <button type="button" className="btn mt-4 border-white/20 bg-white text-[#141a3a]"
                onClick={() => openGoal({ kind: "emergency", name: "Fondo de emergencia", target_amount: suggested || undefined })}>
                Crear fondo de emergencia
              </button>
            </div>
          </div>
        </section>
      )}

      {fund && months != null && (
        <div className="card flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-xl bg-pos-soft text-pos"><ShieldCheck size={20} /></span>
          <p className="text-[14px] text-ink-2">El fondo cubre <b className="text-ink">{months.toLocaleString("es-MX", { maximumFractionDigits: 1 })} meses</b> de gastos esenciales ({hh.fmt(r.essentialMonthly)} por mes). {months >= 6 ? "Están cubiertos: lo que sobre, a metas o inversión." : months >= 3 ? "Ya pasaron el mínimo. Sigan hasta 6." : "El mínimo recomendable son 3 meses."}</p>
        </div>
      )}

      <Section title="Metas" aside={<button type="button" className="btn btn-sm btn-soft" onClick={() => openGoal({ kind: "goal" })}><Plus size={16} /> Nueva</button>}>
        {goals.length === 0 ? (
          <Empty title="Sin metas todavía" icon={<PiggyBank size={22} />}>Vacaciones, cambiar el auto, la cuota inicial de una casa. Con una fecha, la app calcula cuánto apartar por mes.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {goals.map((g) => {
              const p = goalPlan(g, hh.today);
              return (
                <li key={g.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">{g.kind === "emergency" ? <ShieldCheck size={20} /> : <PiggyBank size={20} />}</span>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openGoal(g)}>
                      <p className="truncate font-semibold">{g.name}</p>
                      <p className="num text-[13px] text-ink-2">{hh.fmt(g.saved_amount)} de {hh.fmt(g.target_amount)}{g.target_date ? ` · para ${dayLabel(g.target_date, hh.today)}` : ""}</p>
                    </button>
                    <span className="num text-[18px] font-bold">{formatPct(p.progress)}</span>
                  </div>
                  <div className="mt-3"><Progress value={g.saved_amount} max={g.target_amount} tone="pos" label={`Progreso de ${g.name}`} /></div>
                  <div className="mt-3 flex items-center gap-2">
                    <p className="min-w-0 flex-1 text-[13px] text-ink-2">
                      {p.remaining <= 0 ? "¡Meta cumplida!" : p.monthly != null ? <>Faltan {hh.fmt(p.remaining)}: <b className="text-ink">{hh.fmt(Math.ceil(p.monthly))}/mes</b></> : <>Faltan {hh.fmt(p.remaining)}</>}
                    </p>
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => setContrib(g)}><Plus size={15} /> Aportar</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <p className="px-1 text-[13px] text-ink-3">
        Cada aporte queda registrado como movimiento en “Ahorro e inversión”, así cuenta en la tasa de ahorro del mes y no se confunde con un gasto.
      </p>

      <GoalSheet key={key} open={open} onOpenChange={setOpen} draft={draft} />
      <AmountSheet key={contrib?.id ?? "none"} open={Boolean(contrib)} onOpenChange={(o) => !o && setContrib(null)} title={contrib ? contrib.name : "Aporte"}
        description="Registrá lo que apartaron para esta meta." allowWithdraw
        initial={contrib ? Math.max(0, Math.round(goalPlan(contrib, hh.today).monthly ?? 0)) : 0}
        confirmLabel={(n, w) => (n > 0 ? `${w ? "Retirar" : "Aportar"} ${hh.fmt(n)}` : "Ingresá el monto")}
        onConfirm={async (n, w) => {
          if (!contrib) return false;
          const ok = await hh.contributeGoal(contrib, w ? -n : n);
          if (ok) toast.success(w ? "Retiro registrado" : `Aporte de ${hh.fmt(n)} registrado`);
          return ok;
        }} />
    </>
  );
}
