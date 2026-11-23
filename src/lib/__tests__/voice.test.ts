import { describe, expect, it } from "vitest";
import { amountInText, parseSpoken } from "../voice";
import type { Category } from "../types";

const cat = (id: string, name: string, kind: Category["kind"], keywords: string[], bucket: Category["bucket"] = "need"): Category => ({
  id, household_id: "h", name, kind, bucket: kind === "income" ? null : bucket, icon: "dots", color: "slate", keywords, monthly_budget: null, sort: 10, archived: false,
});
const CATS = [
  cat("super", "Supermercado", "expense", ["super", "supermercado", "oxxo", "walmart"]),
  cat("salud", "Salud", "expense", ["farmacia", "doctor"]),
  cat("transp", "Transporte", "expense", ["nafta", "gasolina", "uber"]),
  cat("comida", "Comida afuera", "expense", ["tacos", "pizza", "cafe"], "want"),
  cat("sueldo", "Sueldo", "income", ["sueldo", "quincena"]),
];
const TODAY = "2026-11-23"; // lunes
const p = (t: string) => parseSpoken(t, CATS, [], TODAY);

describe("parseSpoken", () => {
  it("monto en dígitos y concepto", () => {
    const r = p("Gasté 12000 en farmacia");
    expect(r.amount).toBe(12000);
    expect(r.note).toBe("Farmacia");
    expect(r.category?.id).toBe("salud");
    expect(r.kind).toBe("expense");
  });
  it("números con palabras", () => {
    expect(p("dos mil quinientos de gasolina").amount).toBe(2500);
    expect(p("cuarenta y cinco mil en el súper").amount).toBe(45000);
    expect(p("mil quinientos tacos").amount).toBe(1500);
    expect(p("un millón doscientos mil del auto").amount).toBe(1_200_000);
    expect(p("12 mil 500 de nafta").amount).toBe(12500);
    expect(p("$45,000 walmart").amount).toBe(45000);
    expect(p("20 lucas de pizza").amount).toBe(20000);
  });
  it("elige el monto, no la cantidad", () => {
    const r = p("un café de 3500");
    expect(r.amount).toBe(3500);
    expect(r.note).toBe("Café");
  });
  it("detecta ingresos", () => {
    const r = p("cobré la quincena 18 mil pesos");
    expect(r.kind).toBe("income");
    expect(r.amount).toBe(18000);
    expect(r.category?.id).toBe("sueldo");
  });
  it("fechas habladas", () => {
    expect(p("ayer 500 de uber").date).toBe("2026-11-22");
    expect(p("antier 300 tacos").date).toBe("2026-11-21");
    expect(p("el viernes 800 de pizza").date).toBe("2026-11-20");
  });
  it("categoría explícita", () => {
    const r = p("Gasté 900 en regalo para mamá categoría salud");
    expect(r.category?.id).toBe("salud");
    expect(r.note).toBe("Regalo para mamá");
  });
  it("sin monto", () => {
    expect(p("súper").amount).toBeNull();
  });
  it("monto dentro de un texto escrito", () => {
    expect(amountInText("súper 45 mil")).toBe(45000);
    expect(amountInText("farmacia")).toBeNull();
  });
});
