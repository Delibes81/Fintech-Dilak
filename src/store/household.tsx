"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { addMonths, currentYM, firstDay, todayISO, ymOf } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { Category, Goal, Household, Member, NewTx, Recurring, Tx } from "@/lib/types";

/* ------------------------------ Tipos ------------------------------ */

interface HouseholdCtx {
  userId: string;
  email: string;
  household: Household;
  members: Member[];
  me: Member | undefined;
  categories: Category[];
  recurring: Recurring[];
  goals: Goal[];
  months: Record<string, Tx[] | undefined>;
  ym: string;
  setYm: (ym: string) => void;
  today: string;
  /** Movimientos de los últimos 3 meses (para aprender categorías y armar atajos). */
  history: Tx[];
  ensureMonths: (yms: string[], force?: boolean) => void;
  fmt: (n: number, opts?: { sign?: boolean }) => string;
  memberName: (userId: string | null) => string;
  // Acciones
  addTx: (t: NewTx) => Promise<Tx | null>;
  updateTx: (id: string, patch: Partial<Tx>) => Promise<boolean>;
  deleteTx: (t: Tx) => Promise<boolean>;
  restoreTx: (t: Tx) => Promise<boolean>;
  saveRecurring: (r: Partial<Recurring> & Pick<Recurring, "name" | "amount">) => Promise<boolean>;
  deleteRecurring: (r: Recurring) => Promise<boolean>;
  saveCategory: (c: Partial<Category> & Pick<Category, "name" | "kind">) => Promise<boolean>;
  saveGoal: (g: Partial<Goal> & Pick<Goal, "name" | "target_amount">) => Promise<boolean>;
  contributeGoal: (g: Goal, amount: number) => Promise<boolean>;
  updateHousehold: (patch: Partial<Household>) => Promise<boolean>;
  updateMe: (patch: Partial<Pick<Member, "display_name" | "color">>) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<HouseholdCtx | null>(null);

export function useHousehold() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHousehold debe usarse dentro de <HouseholdProvider>");
  return v;
}

/* ---------------------------- Utilidades ---------------------------- */

const num = (x: unknown) => (x == null ? null : Number(x));
const toTx = (r: Record<string, unknown>): Tx => ({ ...(r as unknown as Tx), amount: Number(r.amount) });
const toRec = (r: Record<string, unknown>): Recurring => ({ ...(r as unknown as Recurring), amount: Number(r.amount) });
const toGoal = (r: Record<string, unknown>): Goal => ({
  ...(r as unknown as Goal), target_amount: Number(r.target_amount), saved_amount: Number(r.saved_amount),
});
const toCat = (r: Record<string, unknown>): Category => ({
  ...(r as unknown as Category), monthly_budget: num(r.monthly_budget), keywords: (r.keywords as string[]) ?? [],
});

const sortTx = (a: Tx[]) =>
  [...a].sort((x, y) => (y.occurred_on !== x.occurred_on ? y.occurred_on.localeCompare(x.occurred_on) : y.created_at.localeCompare(x.created_at)));
const sortBy = <T,>(a: T[], f: (x: T) => string | number) => [...a].sort((x, y) => (f(x) > f(y) ? 1 : f(x) < f(y) ? -1 : 0));
const upsertIn = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

function errorText(e: { code?: string; message?: string } | null) {
  if (!e) return "Algo salió mal.";
  if (e.code === "23505") return "Eso ya estaba cargado.";
  if (e.code === "42501" || e.message?.includes("row-level security")) return "No tenés permiso para hacer eso.";
  if (e.message?.toLowerCase().includes("fetch")) return "Sin conexión. Revisá internet y probá de nuevo.";
  return "No se pudo guardar. Probá de nuevo.";
}

const vibrate = () => {
  try { navigator.vibrate?.(12); } catch { /* sin vibración */ }
};

/* ----------------------------- Provider ----------------------------- */

interface Base {
  userId: string;
  email: string;
  household: Household;
  members: Member[];
  categories: Category[];
  recurring: Recurring[];
  goals: Goal[];
}

export function HouseholdProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const router = useRouter();
  const [base, setBase] = useState<Base | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  const [months, setMonths] = useState<Record<string, Tx[] | undefined>>({});
  const [ym, setYm] = useState<string>("");
  const [today, setToday] = useState<string>("");
  // Registro de meses pedidos/cargados (fuera del estado de React: no dispara renders)
  const [loader] = useState(() => ({ inflight: new Set<string>(), loaded: new Set<string>() }));

  /* Carga inicial */
  useEffect(() => {
    let alive = true;
    (async () => {
      const sb = supabase();
      const { data: auth } = await sb.auth.getUser();
      const user = auth.user;
      if (!user) { router.replace("/login"); return; }
      const { data: mem, error } = await sb.from("household_members").select("household_id").eq("user_id", user.id).limit(1);
      if (error) { if (alive) setFailed(`${error.code ?? ""} ${error.message}`.trim()); return; }
      if (!mem?.length) { if (alive) setNoAccess(true); return; }
      const hid = mem[0].household_id as string;
      const [h, ms, cs, rs, gs] = await Promise.all([
        sb.from("households").select("*").eq("id", hid).single(),
        sb.from("household_members").select("*").eq("household_id", hid),
        sb.from("categories").select("*").eq("household_id", hid).order("sort"),
        sb.from("recurring").select("*").eq("household_id", hid),
        sb.from("goals").select("*").eq("household_id", hid),
      ]);
      if (!alive) return;
      if (h.error || !h.data) { setFailed(h.error ? `${h.error.code ?? ""} ${h.error.message}`.trim() : "No se encontró el hogar"); return; }
      setToday(todayISO());
      setYm(currentYM());
      setBase({
        userId: user.id,
        email: user.email ?? "",
        household: h.data as Household,
        members: (ms.data ?? []) as Member[],
        categories: (cs.data ?? []).map(toCat),
        recurring: (rs.data ?? []).map(toRec),
        goals: (gs.data ?? []).map(toGoal),
      });
    })().catch((e: unknown) => alive && setFailed(e instanceof Error ? e.message : "Error desconocido"));
    return () => { alive = false; };
  }, [router]);

  /* Mantener "hoy" al día si la app queda abierta pasada la medianoche */
  useEffect(() => {
    const onFocus = () => setToday((t) => (t && t !== todayISO() ? todayISO() : t));
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, []);

  const hid = base?.household.id;

  /* Meses de movimientos, bajo demanda */
  const ensureMonths = useCallback((yms: string[], force = false) => {
    if (!hid) return;
    const missing = [...new Set(yms)].filter((m) => m && !loader.inflight.has(m) && (force || !loader.loaded.has(m)));
    if (!missing.length) return;
    missing.forEach((m) => loader.inflight.add(m));
    const sorted = [...missing].sort();
    const from = firstDay(sorted[0]);
    const to = firstDay(addMonths(sorted[sorted.length - 1], 1));
    supabase()
      .from("transactions").select("*").eq("household_id", hid)
      .gte("occurred_on", from).lt("occurred_on", to)
      .order("occurred_on", { ascending: false }).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        missing.forEach((m) => loader.inflight.delete(m));
        if (error) { toast.error("No pudimos traer los movimientos. Revisá la conexión."); return; }
        const rows = (data ?? []).map(toTx);
        missing.forEach((m) => loader.loaded.add(m));
        setMonths((prev) => {
          const next = { ...prev };
          for (const m of missing) next[m] = sortTx(rows.filter((t) => ymOf(t.occurred_on) === m));
          return next;
        });
      });
  }, [hid, loader]);

  /* Movimientos: helpers locales */
  const putTx = useCallback((t: Tx) => {
    setMonths((m) => {
      const next: Record<string, Tx[] | undefined> = {};
      for (const k of Object.keys(m)) next[k] = m[k]?.filter((x) => x.id !== t.id);
      const k = ymOf(t.occurred_on);
      if (next[k]) next[k] = sortTx([...next[k]!, t]);
      return next;
    });
  }, []);
  const dropTx = useCallback((id: string) => {
    setMonths((m) => {
      const next: Record<string, Tx[] | undefined> = {};
      for (const k of Object.keys(m)) next[k] = m[k]?.filter((x) => x.id !== id);
      return next;
    });
  }, []);

  /* Tiempo real */
  useEffect(() => {
    if (!hid) return;
    const sb = supabase();
    type P = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Record<string, unknown>; old: Record<string, unknown> };
    const patchBase = (f: (b: Base) => Base) => setBase((b) => (b ? f(b) : b));
    const ch = sb
      .channel(`hogar-${hid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `household_id=eq.${hid}` }, (p: P) => {
        if (p.eventType === "DELETE") dropTx(String(p.old.id));
        else putTx(toTx(p.new));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "recurring", filter: `household_id=eq.${hid}` }, (p: P) =>
        patchBase((b) => ({ ...b, recurring: p.eventType === "DELETE" ? b.recurring.filter((r) => r.id !== p.old.id) : upsertIn(b.recurring, toRec(p.new)) })))
      .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter: `household_id=eq.${hid}` }, (p: P) =>
        patchBase((b) => ({ ...b, categories: sortBy(p.eventType === "DELETE" ? b.categories.filter((c) => c.id !== p.old.id) : upsertIn(b.categories, toCat(p.new)), (c) => c.sort) })))
      .on("postgres_changes", { event: "*", schema: "public", table: "goals", filter: `household_id=eq.${hid}` }, (p: P) =>
        patchBase((b) => ({ ...b, goals: p.eventType === "DELETE" ? b.goals.filter((g) => g.id !== p.old.id) : upsertIn(b.goals, toGoal(p.new)) })))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "households", filter: `id=eq.${hid}` }, (p: P) =>
        patchBase((b) => ({ ...b, household: p.new as unknown as Household })))
      .on("postgres_changes", { event: "*", schema: "public", table: "household_members", filter: `household_id=eq.${hid}` }, (p: P) =>
        patchBase((b) => ({
          ...b,
          members: p.eventType === "DELETE"
            ? b.members.filter((m) => !(m.user_id === p.old.user_id))
            : [...b.members.filter((m) => m.user_id !== (p.new as unknown as Member).user_id), p.new as unknown as Member],
        })))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [hid, putTx, dropTx]);

  /* Al volver a la app después de un rato, refrescar los meses ya cargados */
  useEffect(() => {
    if (!hid) return;
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 60_000) ensureMonths([...loader.loaded], true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [hid, ensureMonths, loader]);

  /* Precarga: mes elegido + 3 anteriores (promedios) y los 3 últimos reales (atajos) */
  useEffect(() => {
    if (!ym || !hid) return;
    const cur = currentYM();
    ensureMonths([ym, addMonths(ym, -1), addMonths(ym, -2), addMonths(ym, -3), cur, addMonths(cur, -1), addMonths(cur, -2)]);
  }, [ym, hid, ensureMonths]);

  const value = useMemo<HouseholdCtx | null>(() => {
    if (!base || !ym) return null;
    const sb = supabase();
    const { household } = base;
    const currency = household.currency || "ARS";
    const fmt = (n: number, opts?: { sign?: boolean }) => formatMoney(n, currency, opts);
    const me = base.members.find((m) => m.user_id === base.userId);
    const memberName = (id: string | null) => {
      if (!id) return "Alguien";
      const m = base.members.find((x) => x.user_id === id);
      const first = (m?.display_name || "").split(" ")[0];
      return id === base.userId ? first || "Vos" : first || "Alguien";
    };
    const cur = currentYM();
    const history = [cur, addMonths(cur, -1), addMonths(cur, -2)]
      .flatMap((k) => months[k] ?? [])
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const fail = (e: { code?: string; message?: string } | null) => { toast.error(errorText(e)); return false; };

    return {
      ...base, me, months, ym, setYm, today, history, ensureMonths, fmt, memberName,

      async addTx(input) {
        const tx: Tx = {
          id: crypto.randomUUID(), household_id: household.id, created_by: base.userId, created_at: new Date().toISOString(),
          recurring_id: null, goal_id: null, ...input,
        };
        putTx(tx);
        vibrate();
        const { error } = await sb.from("transactions").insert({
          id: tx.id, household_id: tx.household_id, kind: tx.kind, amount: tx.amount, category_id: tx.category_id,
          note: tx.note, occurred_on: tx.occurred_on, recurring_id: tx.recurring_id, goal_id: tx.goal_id,
        });
        if (error) { dropTx(tx.id); fail(error); return null; }
        return tx;
      },

      async updateTx(id, patch) {
        const old = Object.values(months).flatMap((m) => m ?? []).find((t) => t.id === id);
        if (old) putTx({ ...old, ...patch });
        const { id: _id, household_id: _h, created_at: _c, created_by: _b, ...rest } = patch as Tx;
        void _id; void _h; void _c; void _b;
        const { error } = await sb.from("transactions").update(rest).eq("id", id);
        if (error) { if (old) putTx(old); return fail(error); }
        return true;
      },

      async deleteTx(t) {
        dropTx(t.id);
        const { error } = await sb.from("transactions").delete().eq("id", t.id);
        if (error) { putTx(t); return fail(error); }
        return true;
      },

      async restoreTx(t) {
        putTx(t);
        const { error } = await sb.from("transactions").insert({
          id: t.id, household_id: t.household_id, kind: t.kind, amount: t.amount, category_id: t.category_id,
          note: t.note, occurred_on: t.occurred_on, recurring_id: t.recurring_id, goal_id: t.goal_id, created_by: t.created_by,
        });
        if (error) { dropTx(t.id); return fail(error); }
        return true;
      },

      async saveRecurring(r) {
        const row = {
          id: r.id ?? crypto.randomUUID(), household_id: household.id, name: r.name.trim(), amount: r.amount,
          category_id: r.category_id ?? null, frequency: r.frequency ?? "monthly", due_day: r.due_day ?? 10,
          due_month: r.frequency === "yearly" ? r.due_month ?? 1 : null, active: r.active ?? true,
        };
        const prev = base.recurring;
        setBase((b) => b && { ...b, recurring: upsertIn(b.recurring, { created_by: base.userId, ...row } as Recurring) });
        const { error } = await sb.from("recurring").upsert(row);
        if (error) { setBase((b) => b && { ...b, recurring: prev }); return fail(error); }
        return true;
      },

      async deleteRecurring(r) {
        setBase((b) => b && { ...b, recurring: b.recurring.filter((x) => x.id !== r.id) });
        const { error } = await sb.from("recurring").delete().eq("id", r.id);
        if (error) { setBase((b) => b && { ...b, recurring: upsertIn(b.recurring, r) }); return fail(error); }
        return true;
      },

      async saveCategory(c) {
        const row = {
          id: c.id ?? crypto.randomUUID(), household_id: household.id, name: c.name.trim(), kind: c.kind,
          bucket: c.kind === "income" ? null : c.bucket ?? "want", icon: c.icon ?? "dots", color: c.color ?? "slate",
          keywords: c.keywords ?? [], monthly_budget: c.monthly_budget ?? null, sort: c.sort ?? 500, archived: c.archived ?? false,
        };
        const prev = base.categories;
        setBase((b) => b && { ...b, categories: sortBy(upsertIn(b.categories, row as Category), (x) => x.sort) });
        const { error } = await sb.from("categories").upsert(row);
        if (error) { setBase((b) => b && { ...b, categories: prev }); return fail(error); }
        return true;
      },

      async saveGoal(g) {
        const row = {
          id: g.id ?? crypto.randomUUID(), household_id: household.id, name: g.name.trim(), kind: g.kind ?? "goal",
          target_amount: g.target_amount, saved_amount: g.saved_amount ?? 0, target_date: g.target_date ?? null, archived: g.archived ?? false,
        };
        const prev = base.goals;
        setBase((b) => b && { ...b, goals: upsertIn(b.goals, row as Goal) });
        const { error } = await sb.from("goals").upsert(row);
        if (error) { setBase((b) => b && { ...b, goals: prev }); return fail(error); }
        return true;
      },

      async contributeGoal(g, amount) {
        setBase((b) => b && { ...b, goals: b.goals.map((x) => (x.id === g.id ? { ...x, saved_amount: Math.max(0, x.saved_amount + amount) } : x)) });
        vibrate();
        const { error } = await sb.rpc("contribute_goal", { p_goal: g.id, p_amount: amount, p_date: todayISO() });
        if (error) { setBase((b) => b && { ...b, goals: b.goals.map((x) => (x.id === g.id ? g : x)) }); return fail(error); }
        return true;
      },

      async updateHousehold(patch) {
        const prev = base.household;
        setBase((b) => b && { ...b, household: { ...b.household, ...patch } });
        const { id: _i, invite_code: _c, ...rest } = patch as Household;
        void _i; void _c;
        const { error } = await sb.from("households").update(rest).eq("id", household.id);
        if (error) { setBase((b) => b && { ...b, household: prev }); return fail(error); }
        return true;
      },

      async updateMe(patch) {
        setBase((b) => b && { ...b, members: b.members.map((m) => (m.user_id === base.userId ? { ...m, ...patch } : m)) });
        const { error } = await sb.from("household_members").update(patch).eq("household_id", household.id).eq("user_id", base.userId);
        if (error) return fail(error);
        return true;
      },

      async signOut() {
        await sb.auth.signOut();
        router.replace("/login");
        router.refresh();
      },
    };
  }, [base, months, ym, today, ensureMonths, putTx, dropTx, router]);

  if (noAccess)
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="card max-w-sm space-y-3 p-6">
          <p className="text-xl font-semibold">Esta cuenta no tiene acceso</p>
          <p className="text-[14px] text-ink-2">Fintech Dilak es privado para los dos usuarios del hogar. Si sos uno de ellos, falta vincular tu cuenta (paso “setup_household” del README).</p>
          <button className="btn btn-primary" onClick={async () => { await supabase().auth.signOut(); router.replace("/login"); }}>Cerrar sesión</button>
        </div>
      </div>
    );
  if (failed)
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-xl font-bold">No pudimos abrir Fintech Dilak</p>
          <p className="text-ink-2">Revisá tu conexión a internet. Si el problema sigue, cerrá sesión y volvé a entrar.</p>
          <p className="num rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-[12px] break-words text-ink-3">Detalle técnico: {failed}</p>
          <div className="flex justify-center gap-2">
            <button className="btn" onClick={async () => { await supabase().auth.signOut(); router.replace("/login"); }}>Cerrar sesión</button>
            <button className="btn btn-primary" onClick={() => location.reload()}>Reintentar</button>
          </div>
        </div>
      </div>
    );
  if (!value) return <>{fallback}</>;
  return <Ctx value={value}>{children}</Ctx>;
}
