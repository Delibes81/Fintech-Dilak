import { describe, expect, it } from "vitest";
import { parseAmount } from "../money";
import { detectCategory, frequentEntries } from "../smart";
import { buildReport, dueItems, goalPlan, healthScore, insights, roundNice, suggestBudgets } from "../finance/engine";
import type { Category, Goal, Recurring, Tx } from "../types";

const cat = (id: string, name: string, bucket: Category["bucket"], extra: Partial<Category> = {}): Category => ({
  id, household_id: "h", name, kind: bucket ? "expense" : "income", bucket, icon: "dots", color: "slate",
  keywords: [], monthly_budget: null, sort: 10, archived: false, ...extra,
});
const CATS = [
  cat("super", "Supermercado", "need", { keywords: ["super", "coto"] }),
  cat("comida", "Comida afuera", "want", { keywords: ["delivery", "pizza"], monthly_budget: 50000 }),
  cat("serv", "Servicios", "need", { keywords: ["luz"] }),
  cat("subs", "Suscripciones", "want", { icon: "repeat" }),
  cat("ahorro", "Ahorro e inversión", "saving"),
  cat("sueldo", "Sueldo", null, { keywords: ["sueldo"] }),
];
let n = 0;
const tx = (p: Partial<Tx>): Tx => ({
  id: `t${n++}`, household_id: "h", kind: "expense", amount: 0, category_id: null, note: "", occurred_on: "2026-11-01",
  recurring_id: null, goal_id: null, created_by: "u", created_at: `2026-11-01T00:00:${String(n).padStart(2, "0")}Z`, ...p,
});
const rec = (p: Partial<Recurring>): Recurring => ({
  id: "r1", household_id: "h", name: "Luz", amount: 40000, category_id: "serv", frequency: "monthly", due_day: 10,
  due_month: null, active: true, created_by: "u", ...p,
});
const fmt = (x: number) => `$${Math.round(x)}`;

describe("parseAmount", () => {
  it("entiende formatos locales", () => {
    expect(parseAmount("45.000")).toBe(45000);
    expect(parseAmount("45,50")).toBe(45.5);
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("30k")).toBe(30000);
    expect(parseAmount("$ 12500")).toBe(12500);
    expect(parseAmount("")).toBeNaN();
  });
});

describe("detectCategory", () => {
  it("usa palabras clave, prefijos y lo aprendido", () => {
    expect(detectCategory("Súper del barrio", CATS, [])?.id).toBe("super");
    expect(detectCategory("supermercadito", CATS, [])?.id).toBe("super");
    expect(detectCategory("cobré el sueldo", CATS, [])?.id).toBe("sueldo");
    expect(detectCategory("Amazon", CATS, [])).toBeNull();
    const hist = [tx({ note: "Amazon", category_id: "super" })];
    expect(detectCategory("amazon", CATS, hist)?.id).toBe("super");
  });
  it("arma atajos con lo que se repite", () => {
    const h = [tx({ note: "Café", amount: 3000 }), tx({ note: "café", amount: 3500 }), tx({ note: "Única" })];
    const f = frequentEntries(h);
    expect(f).toHaveLength(1);
    expect(f[0].count).toBe(2);
  });
});

describe("buildReport", () => {
  const today = "2026-11-15"; // mitad de mes (30 días)
  const txs = [
    tx({ kind: "income", amount: 1_000_000, category_id: "sueldo", note: "Sueldo" }),
    tx({ amount: 40000, category_id: "serv", recurring_id: "r1", note: "Luz" }),
    tx({ amount: 150000, category_id: "super", occurred_on: "2026-11-10" }),
    tx({ amount: 60000, category_id: "comida", occurred_on: "2026-11-12" }),
    tx({ amount: 100000, category_id: "ahorro", goal_id: "g1" }),
  ];
  const recurring = [
    rec({}),
    rec({ id: "r2", name: "Internet", amount: 30000, due_day: 20 }),
    rec({ id: "r3", name: "Seguro", amount: 120000, frequency: "yearly", due_month: 3 }),
  ];
  const r = buildReport({ ym: "2026-11", today, txs, history: [undefined, undefined, undefined], categories: CATS, recurring, savingsTargetPct: 20 });

  it("separa consumo, ahorro y fijos", () => {
    expect(r.phase).toBe("current");
    expect(r.income).toBe(1_000_000);
    expect(r.consumption).toBe(250000);
    expect(r.saved).toBe(100000);
    expect(r.fixedPaid).toBe(40000);
    expect(r.variable).toBe(210000);
    expect(r.pendingFixed).toBe(30000); // Internet; el seguro anual vence en marzo
    expect(r.monthlyFixed).toBe(80000); // 40k + 30k + 120k/12
  });
  it("calcula el disponible para gastar reservando la meta de ahorro", () => {
    // 1.000.000 − 250.000 − 30.000 − max(100.000, 200.000) = 520.000 para 16 días
    expect(r.safeToSpend).toBe(520000);
    expect(r.daysLeft).toBe(16);
    expect(r.perDay).toBe(32500);
  });
  it("proyecta el cierre con el ritmo de gasto variable", () => {
    expect(r.projectedVariable).toBe(420000); // 210k en 15 días → 420k en 30
    expect(r.projectedConsumption).toBe(490000);
    expect(r.projectedBalance).toBe(410000);
  });
  it("50/30/20 y presupuestos", () => {
    expect(r.buckets).toEqual({ need: 190000, want: 60000, saving: 100000 });
    const comida = r.byCategory.find((l) => l.category.id === "comida")!;
    expect(comida.spent).toBe(60000);
    expect(comida.budget).toBe(50000);
  });
  it("genera alertas útiles y ordenadas", () => {
    const tips = insights(r, [], 20, fmt);
    expect(tips[0].tone).toBe("critical");
    expect(tips.some((t) => t.id === "bud-over-comida")).toBe(true);
    expect(tips.some((t) => t.id === "emergency-missing")).toBe(true);
  });
  it("puntaje de salud entre 0 y 100", () => {
    const goals: Goal[] = [{ id: "g1", household_id: "h", name: "Fondo", kind: "emergency", target_amount: 1e6, saved_amount: 600000, target_date: null, archived: false }];
    const h = healthScore(r, goals, 20);
    expect(h.score).toBeGreaterThan(50);
    expect(h.score).toBeLessThanOrEqual(100);
    expect(h.parts).toHaveLength(4);
  });
  it("estado de los fijos", () => {
    const d = dueItems(recurring, txs, "2026-11", today);
    expect(d.map((x) => x.status)).toEqual(["soon", "paid"]) // Internet vence el 20: faltan 5 días;
    expect(dueItems(recurring, [], "2026-11", "2026-11-25")[0].status).toBe("overdue");
  });
});

describe("utilidades", () => {
  it("redondea lindo y sugiere presupuestos", () => {
    expect(roundNice(45320)).toBe(46000);
    expect(roundNice(980)).toBe(980);
    const r = buildReport({
      ym: "2026-11", today: "2026-11-02", txs: [], categories: CATS, recurring: [], savingsTargetPct: 20,
      history: [
        [tx({ amount: 101000, category_id: "super", occurred_on: "2026-10-03" })],
        [tx({ amount: 99000, category_id: "super", occurred_on: "2026-09-03" })],
        undefined,
      ],
    });
    expect(suggestBudgets(r).super).toBe(100000);
  });
  it("plan de metas con fecha", () => {
    const g: Goal = { id: "g", household_id: "h", name: "Viaje", kind: "goal", target_amount: 1_200_000, saved_amount: 200_000, target_date: "2027-05-01", archived: false };
    const p = goalPlan(g, "2026-11-23");
    expect(p.months).toBe(6);
    expect(Math.round(p.monthly!)).toBe(166667);
  });
});
