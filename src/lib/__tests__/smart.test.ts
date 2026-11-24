import { describe, expect, it } from "vitest";
import { detectCategory } from "../smart";
import type { Category, Tx } from "../types";

const cat = (id: string, name: string, icon: string, keywords: string[] = [], kind: Category["kind"] = "expense", bucket: Category["bucket"] = "need"): Category => ({
  id, household_id: "h", name, kind, bucket: kind === "income" ? null : bucket, icon, color: "slate", keywords, monthly_budget: null, sort: 10, archived: false,
});
// Como las categorías iniciales (con algunas de sus palabras clave rioplatenses)
const CATS = [
  cat("super", "Supermercado", "cart", ["super", "chino", "coto"]),
  cat("comida", "Comida afuera", "utensils", ["delivery", "pizza", "cafe"], "expense", "want"),
  cat("transp", "Transporte", "car", ["nafta", "uber"]),
  cat("viv", "Vivienda", "home", ["expensas"]),
  cat("serv", "Servicios", "zap", ["luz", "gas", "internet"]),
  cat("subs", "Suscripciones", "repeat", ["netflix"], "expense", "want"),
  cat("salud", "Salud", "heart", ["farmacia"]),
  cat("hogar", "Hogar", "sofa"),
  cat("ropa", "Ropa", "shirt", [], "expense", "want"),
  cat("masc", "Mascotas", "paw", ["perro"]),
  cat("ocio", "Ocio y salidas", "ticket", [], "expense", "want"),
  cat("ahorro", "Ahorro e inversión", "piggy", ["ahorro"], "expense", "saving"),
  cat("sueldo", "Sueldo", "briefcase", ["sueldo"], "income"),
];
const d = (note: string, history: Tx[] = []) => detectCategory(note, CATS, history)?.id ?? null;
let seq = 0;
const tx = (note: string, category_id: string): Tx => ({
  id: `t${seq++}`, household_id: "h", kind: "expense", amount: 100, category_id, note, occurred_on: "2026-11-01",
  recurring_id: null, goal_id: null, created_by: "u", created_at: `2026-11-01T10:00:${String(seq).padStart(2, "0")}Z`,
});

describe("diccionario de México", () => {
  it("comercios", () => {
    expect(d("Oxxo")).toBe("super");
    expect(d("Bodega Aurrera")).toBe("super");
    expect(d("Sam's")).toBe("super");
    expect(d("Pemex")).toBe("transp");
    expect(d("Telcel")).toBe("serv");
    expect(d("CFE bimestre")).toBe("serv");
    expect(d("Liverpool")).toBe("ropa");
    expect(d("Cinépolis")).toBe("ocio");
    expect(d("Dr. Simi")).toBe("salud");
    expect(d("Home Depot")).toBe("hogar");
  });
  it("cosas comunes", () => {
    expect(d("croquetas")).toBe("masc");
    expect(d("leche y tortillas")).toBe("super");
    expect(d("papel de baño")).toBe("super");
    expect(d("tamales")).toBe("comida");
    expect(d("unas chelas")).toBe("comida");
    expect(d("paracetamol")).toBe("salud");
    expect(d("caseta a Puebla")).toBe("transp");
    expect(d("tanque de gas")).toBe("serv");
  });
  it("la frase más larga gana", () => {
    expect(d("Oxxo gas")).toBe("transp");
    expect(d("Uber Eats")).toBe("comida");
    expect(d("Farmacias del Ahorro")).toBe("salud");
    expect(d("Cuidado con el perro")).toBe("ropa");
    expect(d("baño del perro")).toBe("masc");
  });
  it("apps", () => {
    expect(d("Uber Eats")).toBe("comida");
    expect(d("uber its")).toBe("comida"); // así lo suele escribir el dictado
    expect(d("DiDi Food")).toBe("comida");
    expect(d("Rappi")).toBe("comida");
    expect(d("Rappi Turbo")).toBe("super");
    expect(d("Uber")).toBe("transp");
    expect(d("DiDi moto")).toBe("transp");
    expect(d("InDrive")).toBe("transp");
    expect(d("Uber One")).toBe("subs");
    expect(d("Rappi Prime")).toBe("subs");
  });
  it("plurales y errores de una letra", () => {
    expect(d("tacos al pastor")).toBe("comida");
    expect(d("soriaba")).toBe("super");
    expect(d("netflx")).toBe("subs");
  });
  it("palabras clave propias pesan más que el diccionario", () => {
    expect(d("gas")).toBe("serv");
    expect(d("perro")).toBe("masc");
  });
  it("sin pistas no inventa", () => {
    expect(d("cosas varias")).toBeNull();
    expect(d("Amazon")).toBeNull();
  });
});

describe("aprende por palabra", () => {
  it("una corrección pisa al diccionario para esa palabra", () => {
    const h = [tx("Oxxo", "comida")];
    expect(d("Oxxo reforma", h)).toBe("comida");
  });
  it("aprende comercios que no conoce", () => {
    const h = [tx("Amazon audífonos", "hogar")];
    expect(d("amazon", h)).toBe("hogar");
  });
  it("aprende el resto de un detalle ya reconocido", () => {
    const h = [tx("Tacos don Pepe", "comida")];
    expect(d("don pepe", h)).toBe("comida");
  });
  it("las palabras de lugar no arrastran la categoría", () => {
    const h = [tx("Oxxo Insurgentes", "super")];
    expect(d("Pemex Insurgentes", h)).toBe("transp");
  });
  it("una palabra clave propia necesita dos correcciones para cambiar", () => {
    expect(d("super walmart", [tx("super walmart", "hogar")])).toBe("hogar"); // mismo detalle exacto: aprende al toque
    expect(d("super", [tx("Super chico", "hogar")])).toBe("super");
    expect(d("super", [tx("Super chico", "hogar"), tx("Super grande", "hogar")])).toBe("hogar");
  });
});
