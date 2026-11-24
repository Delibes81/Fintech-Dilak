/**
 * Cuánto se va en apps de comida a domicilio (Uber Eats, Rappi, DiDi Food).
 * Se reconoce cada pedido por el concepto del movimiento, sin importar en qué categoría quedó,
 * así funciona con todo lo ya cargado y sin tocar la base de datos.
 */
import { normalize } from "../smart";
import { daysInMonth, ymOf } from "../dates";
import type { Category, Tx } from "../types";
import type { Insight } from "./engine";

export type FoodAppKey = "ubereats" | "rappi" | "didifood";

export const FOOD_APPS: { key: FoodAppKey; name: string; color: string; match: string[]; exclude?: string[] }[] = [
  // Con las formas en que el dictado suele escribirlo
  { key: "ubereats", name: "Uber Eats", color: "green", match: ["uber eats", "ubereats", "uber eat", "uber its", "uber it s", "uber ets"] },
  // Rappi Turbo/Market es súper y Rappi Prime/Pro es la membresía: no son pedidos de comida
  { key: "rappi", name: "Rappi", color: "red", match: ["rappi", "rapi"], exclude: ["turbo", "market", "super", "prime", "pro", "card"] },
  { key: "didifood", name: "DiDi Food", color: "orange", match: ["didi food", "didifood", "didi comida", "didi fud"] },
];

/** App de comida de un movimiento, por su concepto. */
export function foodAppOf(note: string | null | undefined): FoodAppKey | null {
  const n = normalize(note ?? "");
  if (!n) return null;
  const padded = ` ${n} `;
  const words = new Set(n.split(" "));
  for (const app of FOOD_APPS) {
    if (!app.match.some((m) => padded.includes(` ${m} `))) continue;
    if (app.exclude?.some((x) => words.has(x))) continue;
    return app.key;
  }
  return null;
}

const isOrder = (t: Tx) => t.kind === "expense" && !t.recurring_id && !t.goal_id && foodAppOf(t.note) != null;

export interface FoodAppLine { key: FoodAppKey; name: string; color: string; total: number; orders: number }
export interface FoodAppsSummary {
  total: number;
  orders: number;
  avgTicket: number;
  byApp: FoodAppLine[];
  /** Promedio mensual de los meses anteriores con datos (null sin historial). */
  avgMonthly: number | null;
  /** Mes en curso: cómo cerraría a este ritmo (null si es pronto para proyectar o no es el mes en curso). */
  projected: number | null;
  /** Ritmo mensual estimado (mezcla el mes con el historial) y su equivalente anual. */
  monthly: number;
  yearly: number;
  /** Parte de lo que gastan en comer (súper + comida afuera + apps). */
  share: number | null;
  phase: "past" | "current" | "future";
}

export function foodAppsSummary(txs: Tx[], history: (Tx[] | undefined)[], categories: Category[], ym: string, today: string): FoodAppsSummary {
  const orders = txs.filter(isOrder);
  const total = orders.reduce((a, t) => a + t.amount, 0);
  const byApp = FOOD_APPS.map((app) => {
    const mine = orders.filter((t) => foodAppOf(t.note) === app.key);
    return { key: app.key, name: app.name, color: app.color, total: mine.reduce((a, t) => a + t.amount, 0), orders: mine.length };
  }).filter((l) => l.orders > 0).sort((a, b) => b.total - a.total);

  const months = history.filter((h): h is Tx[] => Array.isArray(h) && h.length > 0);
  const avgMonthly = months.length ? months.reduce((a, h) => a + h.filter(isOrder).reduce((s, t) => s + t.amount, 0), 0) / months.length : null;

  const curYM = ymOf(today);
  const phase = ym < curYM ? "past" : ym > curYM ? "future" : "current";
  const day = Number(today.slice(8, 10));
  const projected = phase === "current" && day >= 7 ? (total / day) * daysInMonth(ym) : null;
  const thisMonth = phase === "current" ? projected ?? total : total;
  const monthly = avgMonthly != null && phase !== "future" ? (avgMonthly * months.length + thisMonth) / (months.length + 1) : thisMonth;

  const eatingIcons = new Set(["cart", "utensils"]);
  const iconOf = new Map(categories.map((c) => [c.id, c.icon]));
  const eating = txs.filter((t) => t.kind === "expense" && (eatingIcons.has(iconOf.get(t.category_id ?? "") ?? "") || isOrder(t)));
  const eatingTotal = eating.reduce((a, t) => a + t.amount, 0);

  return {
    total, orders: orders.length, avgTicket: orders.length ? total / orders.length : 0, byApp,
    avgMonthly, projected, monthly, yearly: monthly * 12, share: eatingTotal > 0 && total > 0 ? total / eatingTotal : null, phase,
  };
}

/** Consejo del asesor sobre las apps de comida (null si no hay suficientes pedidos para opinar). */
export function foodAppsInsight(s: FoodAppsSummary, fmt: (n: number) => string): Insight | null {
  if (s.phase === "future" || s.orders < 2) return null;
  const top = s.byApp[0];
  const which = s.byApp.length > 1 ? `${top.name} es la que más (${fmt(top.total)})` : `todo en ${top.name}`;
  const closing = s.projected ?? s.total;
  if (s.avgMonthly && closing > s.avgMonthly * 1.25) {
    const pct = Math.round((closing / s.avgMonthly - 1) * 100);
    return {
      id: "food-apps", tone: "warning", href: "/analisis",
      title: "Las apps de comida vienen subiendo",
      body: `Llevan ${fmt(s.total)} en ${s.orders} pedidos; ${which}. ${s.projected ? `A este ritmo cierran el mes en ${fmt(s.projected)}` : "Cerraron el mes"}, ${pct}% más que su promedio de ${fmt(s.avgMonthly)}.`,
    };
  }
  // Cocinar en casa cuesta, a grandes rasgos, menos de la mitad de un pedido: se estima un ahorro del 60%
  const saving = (s.monthly / 3) * 0.6;
  return {
    id: "food-apps", tone: "info", href: "/analisis",
    title: `${fmt(s.total)} en apps de comida ${s.phase === "current" ? "este mes" : "ese mes"}`,
    body: `Son ${s.orders} pedidos (ticket promedio ${fmt(s.avgTicket)}); ${which}. Al año serían unos ${fmt(s.yearly)}: cambiar 1 de cada 3 pedidos por cocinar en casa les ahorraría cerca de ${fmt(saving)} al mes.`,
  };
}
