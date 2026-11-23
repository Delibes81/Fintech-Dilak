/**
 * Motor financiero de Fintech Dilak.
 *
 * Funciones puras (sin React ni Supabase) que convierten los movimientos en
 * las métricas que usaría un asesor financiero de familia:
 * disponible para gastar, proyección de cierre, 50/30/20, tasa de ahorro,
 * peso de los fijos, presupuestos, fondo de emergencia y alertas.
 */
import { addMonths, daysInMonth, dueDateIn, monthNumber, monthsBetween, ymOf } from "../dates";
import type { Bucket, Category, Goal, Recurring, Tx } from "../types";

/* ----------------------------- Utilidades ----------------------------- */

const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Redondea hacia arriba a un número "lindo" (45.320 → 46.000). */
export function roundNice(x: number) {
  if (x <= 0) return 0;
  const m = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1));
  return Math.ceil(x / m) * m;
}

export const isDebtCategory = (c?: Category | null) => c?.icon === "card";
export const isSubscriptionCategory = (c?: Category | null) => c?.icon === "repeat";

/* ------------------------------ Fijos ------------------------------ */

export type RecurringStatus = "paid" | "overdue" | "today" | "soon" | "upcoming" | "missed";

export interface DueItem {
  recurring: Recurring;
  status: RecurringStatus;
  dueDate: string;
  daysLeft: number;
  paidTx?: Tx;
}

export const isDueIn = (r: Recurring, ym: string) =>
  r.active && (r.frequency === "monthly" || r.due_month === monthNumber(ym));

export const monthlyEquivalent = (r: Recurring) => (!r.active ? 0 : r.frequency === "yearly" ? r.amount / 12 : r.amount);

export function dueItems(recurring: Recurring[], txs: Tx[], ym: string, today: string): DueItem[] {
  const paidBy = new Map(txs.filter((t) => t.recurring_id).map((t) => [t.recurring_id!, t]));
  const curYM = ymOf(today);
  return recurring
    .filter((r) => isDueIn(r, ym))
    .map((r) => {
      const dueDate = dueDateIn(ym, r.due_day);
      const daysLeft = Math.round((Date.parse(dueDate) - Date.parse(today)) / 86_400_000);
      const paidTx = paidBy.get(r.id);
      let status: RecurringStatus;
      if (paidTx) status = "paid";
      else if (ym < curYM) status = "missed";
      else if (ym > curYM) status = "upcoming";
      else if (daysLeft < 0) status = "overdue";
      else if (daysLeft === 0) status = "today";
      else if (daysLeft <= 5) status = "soon";
      else status = "upcoming";
      return { recurring: r, status, dueDate, daysLeft, paidTx };
    })
    .sort((a, b) => Number(a.status === "paid") - Number(b.status === "paid") || a.dueDate.localeCompare(b.dueDate));
}

/* --------------------------- Reporte del mes --------------------------- */

export interface CategoryLine {
  category: Category;
  spent: number;
  projected: number;
  budget: number | null;
  avg3: number | null;
  prev: number | null;
}

export interface MonthReport {
  ym: string;
  phase: "past" | "current" | "future";
  daysInMonth: number;
  /** Día del mes de hoy (incluido) en el mes actual; el total en meses pasados. */
  elapsedDays: number;
  /** Días que quedan contando hoy. */
  daysLeft: number;

  income: number;
  expectedIncome: number;
  incomeIsEstimate: boolean;

  /** Gasto de consumo: todo lo que sale menos lo que va a ahorro. */
  consumption: number;
  saved: number;
  fixedPaid: number;
  variable: number;
  pendingFixed: number;
  due: DueItem[];
  monthlyFixed: number;

  projectedVariable: number;
  projectedConsumption: number;
  projectedBalance: number;

  savingsGoal: number;
  /** Lo que se puede gastar en el resto del mes sin tocar fijos ni la meta de ahorro. */
  safeToSpend: number;
  perDay: number | null;

  savingsRate: number | null;
  projectedSavingsRate: number | null;
  fixedRatio: number | null;
  debtRatio: number | null;
  subscriptionsMonthly: number;
  subscriptionsCount: number;

  buckets: Record<Bucket, number>;
  byCategory: CategoryLine[];
  essentialMonthly: number;
  avgIncome3: number | null;
  avgConsumption3: number | null;
}

export interface EngineInput {
  ym: string;
  today: string;
  txs: Tx[];
  /** Meses anteriores [ym-1, ym-2, ym-3]; `undefined` si todavía no se cargaron. */
  history: (Tx[] | undefined)[];
  categories: Category[];
  recurring: Recurring[];
  savingsTargetPct: number;
}

export function buildReport(input: EngineInput): MonthReport {
  const { ym, today, txs, categories, recurring } = input;
  const cat = new Map(categories.map((c) => [c.id, c]));
  const bucketOf = (t: Tx): Bucket | null => (t.kind === "expense" ? cat.get(t.category_id ?? "")?.bucket ?? "want" : null);

  const curYM = ymOf(today);
  const phase = ym < curYM ? "past" : ym > curYM ? "future" : "current";
  const dim = daysInMonth(ym);
  const day = Number(today.slice(8, 10));
  const elapsedDays = phase === "current" ? day : phase === "past" ? dim : 0;
  const daysLeft = phase === "current" ? dim - day + 1 : phase === "future" ? dim : 0;

  const expenses = txs.filter((t) => t.kind === "expense");
  const income = sum(txs.filter((t) => t.kind === "income"), (t) => t.amount);
  const saved = sum(expenses.filter((t) => bucketOf(t) === "saving"), (t) => t.amount);
  const consumptionTxs = expenses.filter((t) => bucketOf(t) !== "saving");
  const consumption = sum(consumptionTxs, (t) => t.amount);
  const fixedPaid = sum(consumptionTxs.filter((t) => t.recurring_id), (t) => t.amount);
  const variable = consumption - fixedPaid;

  // Historial: solo los meses ya cargados
  const hist = input.history.filter((h): h is Tx[] => Array.isArray(h));
  const histStats = hist.map((h) => {
    const exp = h.filter((t) => t.kind === "expense" && bucketOf(t) !== "saving");
    return {
      income: sum(h.filter((t) => t.kind === "income"), (t) => t.amount),
      consumption: sum(exp, (t) => t.amount),
      variable: sum(exp.filter((t) => !t.recurring_id), (t) => t.amount),
      need: sum(exp.filter((t) => bucketOf(t) === "need"), (t) => t.amount),
      byCat: exp.reduce<Record<string, number>>((acc, t) => {
        const k = t.category_id ?? "_";
        acc[k] = (acc[k] ?? 0) + t.amount;
        return acc;
      }, {}),
    };
  });
  const withData = histStats.filter((h) => h.income > 0 || h.consumption > 0);
  const avgIncome3 = avg(withData.filter((h) => h.income > 0).map((h) => h.income));
  const avgConsumption3 = avg(withData.map((h) => h.consumption));
  const avgVariable3 = avg(withData.map((h) => h.variable));

  // Criterio conservador: si ya entró al menos el 60% de lo habitual, se usa lo real
  // (no se cuenta con extras de otros meses). Si todavía no cobraron, se estima con el promedio.
  const incomeIsEstimate = phase !== "past" && avgIncome3 != null && income < avgIncome3 * 0.6;
  const expectedIncome = incomeIsEstimate ? avgIncome3! : income;

  // Fijos
  const due = dueItems(recurring, txs, ym, today);
  const pendingFixed = phase === "past" ? 0 : sum(due.filter((d) => d.status !== "paid"), (d) => d.recurring.amount);
  const monthlyFixed = sum(recurring, monthlyEquivalent);

  // Proyección del gasto variable: mezcla el ritmo actual con el promedio histórico.
  // Al principio de mes pesa más la historia; al final, lo que realmente pasó.
  let projectedVariable = variable;
  if (phase === "current") {
    const pace = (variable / Math.max(1, elapsedDays)) * dim;
    const w = elapsedDays / dim;
    const blended = avgVariable3 != null ? w * pace + (1 - w) * avgVariable3 : pace;
    projectedVariable = Math.max(variable, blended);
  } else if (phase === "future") {
    projectedVariable = avgVariable3 ?? 0;
  }
  const projectedConsumption = fixedPaid + pendingFixed + projectedVariable;
  const projectedBalance = expectedIncome - projectedConsumption - saved;

  const savingsGoal = (expectedIncome * input.savingsTargetPct) / 100;
  const safeToSpend = expectedIncome - consumption - pendingFixed - Math.max(saved, savingsGoal);
  const perDay = phase === "past" ? null : safeToSpend / Math.max(1, daysLeft);

  const savingsRate = income > 0 ? (income - consumption) / income : null;
  const projectedSavingsRate = expectedIncome > 0 ? (expectedIncome - projectedConsumption) / expectedIncome : null;
  const fixedRatio = expectedIncome > 0 ? monthlyFixed / expectedIncome : null;

  const debt = sum(consumptionTxs.filter((t) => isDebtCategory(cat.get(t.category_id ?? ""))), (t) => t.amount)
    + (phase === "past" ? 0 : sum(due.filter((d) => d.status !== "paid" && isDebtCategory(cat.get(d.recurring.category_id ?? ""))), (d) => d.recurring.amount));
  const debtRatio = expectedIncome > 0 ? debt / expectedIncome : null;

  const subs = recurring.filter((r) => r.active && isSubscriptionCategory(cat.get(r.category_id ?? "")));

  const buckets: Record<Bucket, number> = {
    need: sum(consumptionTxs.filter((t) => bucketOf(t) === "need"), (t) => t.amount),
    want: sum(consumptionTxs.filter((t) => bucketOf(t) === "want"), (t) => t.amount),
    saving: saved,
  };

  // Por categoría
  const spentBy = consumptionTxs.reduce<Record<string, number>>((acc, t) => {
    const k = t.category_id ?? "_";
    acc[k] = (acc[k] ?? 0) + t.amount;
    return acc;
  }, {});
  const pendingBy = due
    .filter((d) => d.status !== "paid" && phase !== "past")
    .reduce<Record<string, number>>((acc, d) => {
      const k = d.recurring.category_id ?? "_";
      acc[k] = (acc[k] ?? 0) + d.recurring.amount;
      return acc;
    }, {});
  const byCategory: CategoryLine[] = categories
    .filter((c) => c.kind === "expense" && c.bucket !== "saving")
    .map((c) => {
      const spent = spentBy[c.id] ?? 0;
      const hs = withData.map((h) => h.byCat[c.id] ?? 0);
      const variablePart = sum(consumptionTxs.filter((t) => t.category_id === c.id && !t.recurring_id), (t) => t.amount);
      const fixedPart = spent - variablePart;
      let projected = spent + (pendingBy[c.id] ?? 0);
      if (phase === "current" && elapsedDays >= 7) projected = fixedPart + (pendingBy[c.id] ?? 0) + (variablePart / elapsedDays) * dim;
      return {
        category: c,
        spent,
        projected: Math.max(spent, projected),
        budget: c.monthly_budget,
        avg3: hs.length ? avg(hs) : null,
        prev: histStats[0] && hist[0] ? histStats[0].byCat[c.id] ?? 0 : null,
      };
    })
    .filter((l) => l.spent > 0 || (l.budget ?? 0) > 0 || (l.avg3 ?? 0) > 0)
    .sort((a, b) => b.spent - a.spent || (b.avg3 ?? 0) - (a.avg3 ?? 0));

  const essentialMonthly = avg(withData.map((h) => h.need)) ?? (buckets.need + (phase === "past" ? 0 : pendingFixed));

  return {
    ym, phase, daysInMonth: dim, elapsedDays, daysLeft,
    income, expectedIncome, incomeIsEstimate,
    consumption, saved, fixedPaid, variable, pendingFixed, due, monthlyFixed,
    projectedVariable, projectedConsumption, projectedBalance,
    savingsGoal, safeToSpend, perDay,
    savingsRate, projectedSavingsRate, fixedRatio, debtRatio,
    subscriptionsMonthly: sum(subs, monthlyEquivalent), subscriptionsCount: subs.length,
    buckets, byCategory, essentialMonthly, avgIncome3, avgConsumption3,
  };
}

/* ------------------------- Salud financiera ------------------------- */

export interface HealthPart {
  key: "savings" | "fixed" | "emergency" | "budgets";
  label: string;
  points: number;
  max: number;
  detail: string;
}
export interface Health {
  score: number | null;
  parts: HealthPart[];
}

export function emergencyMonths(goals: Goal[], essentialMonthly: number) {
  const fund = goals.find((g) => g.kind === "emergency" && !g.archived);
  if (!fund || essentialMonthly <= 0) return { fund, months: fund ? null : 0 };
  return { fund, months: fund.saved_amount / essentialMonthly };
}

export function healthScore(r: MonthReport, goals: Goal[], targetPct: number): Health {
  if (r.expectedIncome <= 0) return { score: null, parts: [] };
  const target = (targetPct || 20) / 100;
  const rate = r.phase === "past" ? r.savingsRate ?? 0 : r.projectedSavingsRate ?? 0;
  const savings = clamp01(rate / target) * 35;

  const fr = r.fixedRatio ?? 0;
  const fixed = fr <= 0.5 ? 25 : fr >= 0.8 ? 0 : (1 - (fr - 0.5) / 0.3) * 25;

  const { fund, months } = emergencyMonths(goals, r.essentialMonthly);
  const emergency = clamp01((months ?? 0) / 6) * 25;

  const budgeted = r.byCategory.filter((l) => (l.budget ?? 0) > 0);
  const within = budgeted.filter((l) => l.projected <= (l.budget ?? 0));
  const budgets = budgeted.length ? (within.length / budgeted.length) * 15 : 0;

  const parts: HealthPart[] = [
    { key: "savings", label: "Ahorro", points: savings, max: 35,
      detail: `${Math.round(rate * 100)}% de los ingresos (meta ${Math.round(target * 100)}%)` },
    { key: "fixed", label: "Gastos fijos", points: fixed, max: 25,
      detail: `${Math.round(fr * 100)}% de los ingresos (sano: hasta 50%)` },
    { key: "emergency", label: "Fondo de emergencia", points: emergency, max: 25,
      detail: !fund ? "Todavía no lo armaron" : `${(months ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 1 })} de 6 meses de gastos esenciales` },
    { key: "budgets", label: "Presupuestos", points: budgets, max: 15,
      detail: budgeted.length ? `${within.length} de ${budgeted.length} categorías dentro del presupuesto` : "Sin presupuestos definidos" },
  ];
  return { score: Math.round(savings + fixed + emergency + budgets), parts };
}

/* ------------------------------ Consejos ------------------------------ */

export type Tone = "critical" | "warning" | "good" | "info";
export interface Insight {
  id: string;
  tone: Tone;
  title: string;
  body: string;
  href?: string;
}

type Fmt = (n: number) => string;
const TONE_ORDER: Record<Tone, number> = { critical: 0, warning: 1, info: 2, good: 3 };

export function insights(r: MonthReport, goals: Goal[], targetPct: number, fmt: Fmt): Insight[] {
  const out: Insight[] = [];
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const current = r.phase === "current";

  // Fijos vencidos / por vencer
  const overdue = r.due.filter((d) => d.status === "overdue");
  if (current && overdue.length)
    out.push({ id: "overdue", tone: "critical", href: "/",
      title: overdue.length === 1 ? `${overdue[0].recurring.name} está vencido` : `${overdue.length} fijos vencidos`,
      body: `Suman ${fmt(sum(overdue, (d) => d.recurring.amount))}. Pagarlos a tiempo evita recargos e intereses.` });
  const soon = r.due.filter((d) => d.status === "today" || d.status === "soon");
  if (current && soon.length)
    out.push({ id: "soon", tone: "warning", href: "/",
      title: soon.length === 1 ? `${soon[0].recurring.name} vence ${soon[0].daysLeft === 0 ? "hoy" : `en ${soon[0].daysLeft} días`}` : `${soon.length} fijos vencen esta semana`,
      body: `Reservá ${fmt(sum(soon, (d) => d.recurring.amount))} para cubrirlos.` });

  // Ritmo de gasto general
  if (current && r.expectedIncome > 0 && r.safeToSpend < 0)
    out.push({ id: "overspend", tone: "critical", href: "/analisis",
      title: "Este mes vienen gastando más de lo que entra",
      body: `Para cubrir los fijos y la meta de ahorro faltan ${fmt(-r.safeToSpend)}. Frenar gastos en deseos (salidas, delivery, compras) es lo más rápido.` });
  else if (current && r.expectedIncome > 0 && r.projectedBalance < 0)
    out.push({ id: "projection", tone: "warning", href: "/analisis",
      title: `A este ritmo cierran el mes en ${fmt(r.projectedBalance)}`,
      body: `Para llegar a fin de mes sin déficit, el gasto variable debería bajar a ${fmt(Math.max(0, (r.perDay ?? 0)))} por día.` });

  // Presupuestos
  for (const l of r.byCategory) {
    if (!l.budget) continue;
    if (l.spent > l.budget)
      out.push({ id: `bud-over-${l.category.id}`, tone: "critical", href: "/plan",
        title: `${l.category.name}: presupuesto superado`,
        body: `Llevan ${fmt(l.spent)} de ${fmt(l.budget)} (${pct(l.spent / l.budget - 1)} de más).` });
    else if (current && r.elapsedDays >= 7 && l.projected > l.budget * 1.05)
      out.push({ id: `bud-pace-${l.category.id}`, tone: "warning", href: "/plan",
        title: `${l.category.name}: a este ritmo se pasan`,
        body: `Proyección ${fmt(l.projected)} contra un presupuesto de ${fmt(l.budget)}. Quedan ${fmt(Math.max(0, l.budget - l.spent))} para ${r.daysLeft} días.` });
  }

  // Categorías que se dispararon respecto de su promedio
  if (r.elapsedDays >= 10 || r.phase === "past") {
    const spikes = r.byCategory
      .filter((l) => !l.budget && l.avg3 && l.avg3 > 0 && l.projected > l.avg3 * 1.3 && l.projected - l.avg3 > r.expectedIncome * 0.02)
      .slice(0, 2);
    for (const l of spikes)
      out.push({ id: `spike-${l.category.id}`, tone: "warning", href: "/analisis",
        title: `${l.category.name} viene ${pct(l.projected / l.avg3! - 1)} arriba de lo normal`,
        body: `Promedio de los últimos meses: ${fmt(l.avg3!)}. ${current ? "Proyección" : "Total"} de este mes: ${fmt(l.projected)}.` });
  }

  // Ahorro
  const target = (targetPct || 20) / 100;
  const rate = r.phase === "past" ? r.savingsRate : r.projectedSavingsRate;
  if (rate != null && r.expectedIncome > 0) {
    if (rate >= target)
      out.push({ id: "savings-good", tone: "good", href: "/analisis",
        title: `Van a ahorrar el ${pct(rate)} de lo que entra`,
        body: `Superan la meta del ${pct(target)}. Muevan ese excedente a una meta o al fondo de emergencia apenas cobren, así no se gasta.` });
    else if (rate < 0.1)
      out.push({ id: "savings-low", tone: "warning", href: "/analisis",
        title: rate < 0 ? "Este mes no queda margen para ahorrar" : `El ahorro proyectado es de solo ${pct(rate)}`,
        body: `Lo recomendable es apartar al menos el 10%, idealmente el ${pct(target)}, apenas entra el sueldo: "págate primero".` });
  }

  // Estructura de gastos
  if (r.fixedRatio != null && r.fixedRatio > 0.5)
    out.push({ id: "fixed-high", tone: "warning", href: "/plan",
      title: `Los fijos se llevan el ${pct(r.fixedRatio)} de los ingresos`,
      body: "Lo sano es que no superen el 50%. Revisen planes de celular, internet, seguros y suscripciones: son los más fáciles de renegociar." });
  if (r.debtRatio != null && r.debtRatio > 0.2)
    out.push({ id: "debt-high", tone: "critical", href: "/analisis",
      title: `Las deudas ocupan el ${pct(r.debtRatio)} de los ingresos`,
      body: "Por encima del 20% la deuda empieza a ahogar. Prioricen cancelar la de mayor tasa (tarjeta) y eviten nuevas cuotas." });
  if (r.subscriptionsCount >= 3)
    out.push({ id: "subs", tone: "info", href: "/plan",
      title: `Pagan ${fmt(r.subscriptionsMonthly * 12)} al año en ${r.subscriptionsCount} suscripciones`,
      body: "Una vez por trimestre conviene revisarlas: la que no usaron en el último mes, se da de baja." });

  // Fondo de emergencia
  const { fund, months } = emergencyMonths(goals, r.essentialMonthly);
  if (!fund && r.essentialMonthly > 0)
    out.push({ id: "emergency-missing", tone: "warning", href: "/plan",
      title: "Armen un fondo de emergencia",
      body: `Es la base de todo: entre 3 y 6 meses de gastos esenciales. Para ustedes, unos ${fmt(roundNice(r.essentialMonthly * 6))}.` });
  else if (fund && months != null && months < 3)
    out.push({ id: "emergency-low", tone: "info", href: "/plan",
      title: `El fondo de emergencia cubre ${months.toLocaleString("es-MX", { maximumFractionDigits: 1 })} meses`,
      body: "El mínimo recomendable son 3 meses. Un aporte automático cada vez que cobran es la forma más simple de llegar." });

  return out.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

/* --------------------------- Sugerencias --------------------------- */

/** Presupuesto sugerido por categoría: promedio de los últimos meses, redondeado hacia arriba. */
export function suggestBudgets(r: MonthReport) {
  const out: Record<string, number> = {};
  for (const l of r.byCategory) if (l.avg3 && l.avg3 > 0) out[l.category.id] = roundNice(l.avg3);
  return out;
}

/** Cuánto hay que aportar por mes para llegar a la meta en la fecha elegida. */
export function goalPlan(g: Goal, today: string) {
  const remaining = Math.max(0, g.target_amount - g.saved_amount);
  const progress = g.target_amount > 0 ? clamp01(g.saved_amount / g.target_amount) : 0;
  if (!g.target_date) return { remaining, progress, months: null as number | null, monthly: null as number | null };
  const months = Math.max(1, monthsBetween(today, g.target_date));
  return { remaining, progress, months, monthly: remaining / months };
}

/** Meses previos a `ym` que el motor necesita para promedios. */
export const historyMonths = (ym: string, n = 3) => Array.from({ length: n }, (_, i) => addMonths(ym, -(i + 1)));
