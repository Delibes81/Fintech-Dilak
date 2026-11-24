import { describe, expect, it } from "vitest";
import { foodAppOf, foodAppsInsight, foodAppsSummary } from "../finance/foodApps";
import type { Category, Tx } from "../types";

const cat = (id: string, icon: string): Category => ({
  id, household_id: "h", name: id, kind: "expense", bucket: "want", icon, color: "slate", keywords: [], monthly_budget: null, sort: 1, archived: false,
});
const CATS = [cat("comida", "utensils"), cat("super", "cart"), cat("transp", "car")];
let n = 0;
const tx = (note: string, amount: number, day = 5, ym = "2026-11", extra: Partial<Tx> = {}): Tx => ({
  id: `t${n++}`, household_id: "h", kind: "expense", amount, category_id: "comida", note, occurred_on: `${ym}-${String(day).padStart(2, "0")}`,
  recurring_id: null, goal_id: null, created_by: "u", created_at: `${ym}-01T10:00:00Z`, ...extra,
});
const fmt = (x: number) => `$${Math.round(x)}`;

describe("foodAppOf", () => {
  it("reconoce las apps, también como las escribe el dictado", () => {
    expect(foodAppOf("Uber Eats")).toBe("ubereats");
    expect(foodAppOf("uber its")).toBe("ubereats");
    expect(foodAppOf("Rappi tacos")).toBe("rappi");
    expect(foodAppOf("Pedido DiDi Food")).toBe("didifood");
  });
  it("no confunde otros servicios de las mismas empresas", () => {
    expect(foodAppOf("Uber")).toBeNull();
    expect(foodAppOf("DiDi")).toBeNull();
    expect(foodAppOf("Rappi Turbo")).toBeNull();
    expect(foodAppOf("Rappi Prime")).toBeNull();
    expect(foodAppOf("Tacos")).toBeNull();
  });
});

describe("foodAppsSummary", () => {
  const nov = [tx("Uber Eats", 300, 2), tx("Uber eats sushi", 450, 9), tx("Rappi", 250, 12), tx("Súper", 2000, 3, "2026-11", { category_id: "super" }),
    tx("Uber", 90, 4, "2026-11", { category_id: "transp" }), tx("DiDi Food", 200, 15)];
  const hist = [[tx("Rappi", 400, 3, "2026-10"), tx("Súper", 1800, 5, "2026-10", { category_id: "super" })], [tx("Súper", 1500, 5, "2026-09", { category_id: "super" })], undefined];

  it("suma por app con pedidos y ticket promedio", () => {
    const s = foodAppsSummary(nov, hist, CATS, "2026-11", "2026-11-20");
    expect(s.total).toBe(1200);
    expect(s.orders).toBe(4);
    expect(s.avgTicket).toBe(300);
    expect(s.byApp.map((a) => [a.name, a.total, a.orders])).toEqual([["Uber Eats", 750, 2], ["Rappi", 250, 1], ["DiDi Food", 200, 1]]);
    expect(s.share).toBeCloseTo(1200 / 3200); // de lo que gastan en comer (súper + comida + apps)
  });
  it("compara con el promedio y proyecta el mes y el año", () => {
    const s = foodAppsSummary(nov, hist, CATS, "2026-11", "2026-11-20");
    expect(s.avgMonthly).toBe(200); // (400 + 0) / 2 meses con datos
    expect(s.projected).toBeCloseTo((1200 / 20) * 30);
    expect(s.yearly).toBeCloseTo(((200 * 2 + 1800) / 3) * 12);
  });
  it("el consejo avisa cuando vienen subiendo", () => {
    const tip = foodAppsInsight(foodAppsSummary(nov, hist, CATS, "2026-11", "2026-11-20"), fmt);
    expect(tip?.tone).toBe("warning");
    expect(tip?.body).toContain("Uber Eats es la que más");
  });
  it("sin suficientes pedidos no opina", () => {
    expect(foodAppsInsight(foodAppsSummary([tx("Rappi", 200)], [], CATS, "2026-11", "2026-11-20"), fmt)).toBeNull();
  });
});
