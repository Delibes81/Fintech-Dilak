"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { CURRENCIES } from "@/lib/money";

type Mode = "choose" | "create" | "join";

export default function Bienvenida() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("");
  const [hhName, setHhName] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Si ya pertenece a un hogar, directo a la app
  useEffect(() => {
    (async () => {
      const sb = supabase();
      const { data } = await sb.auth.getUser();
      if (!data.user) { router.replace("/login"); return; }
      const { data: m } = await sb.from("household_members").select("household_id").eq("user_id", data.user.id).limit(1);
      if (m?.length) router.replace("/");
    })();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Contanos tu nombre."); return; }
    setBusy(true); setError("");
    const sb = supabase();
    const { error } = mode === "create"
      ? await sb.rpc("create_household", { p_name: hhName.trim() || "Nuestra casa", p_display_name: name.trim(), p_currency: currency })
      : await sb.rpc("join_household", { p_code: code.trim(), p_display_name: name.trim() });
    setBusy(false);
    if (error) {
      setError(error.message.includes("invalid_code") ? "Ese código no existe. Revisalo con tu pareja (son 6 caracteres)."
        : error.message.includes("household_full") ? "Esa libreta ya tiene el máximo de personas."
        : "No pudimos completar el paso. Probá de nuevo.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-[max(20px,env(safe-area-inset-left))] py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <img src="/icons/icon-192.png" alt="" width={60} height={60} className="mx-auto mb-4 size-[60px] rounded-[18px]" />
          <h1 className="font-display text-[28px] font-extrabold tracking-tight">¡Bienvenidos!</h1>
          <p className="mt-1 text-ink-2">Una libreta por familia. ¿La crean ahora o ya la creó tu pareja?</p>
        </div>

        {mode === "choose" ? (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setMode("create")} className="card flex items-center gap-4 p-5 text-left transition-transform active:scale-[0.99]">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-ink"><BookOpen size={24} /></span>
              <span><span className="block font-display text-[18px] font-bold">Crear nuestra libreta</span><span className="block text-[14px] text-ink-2">Soy quien empieza. Después invito a mi pareja.</span></span>
            </button>
            <button type="button" onClick={() => setMode("join")} className="card flex items-center gap-4 p-5 text-left transition-transform active:scale-[0.99]">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><KeyRound size={24} /></span>
              <span><span className="block font-display text-[18px] font-bold">Tengo un código</span><span className="block text-[14px] text-ink-2">Mi pareja ya la creó y me pasó el código.</span></span>
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="card flex flex-col gap-4 p-5">
            <button type="button" className="btn btn-sm btn-ghost self-start px-1" onClick={() => { setMode("choose"); setError(""); }}><ArrowLeft size={16} /> Volver</button>
            <label className="flex flex-col gap-1.5"><span className="label">Tu nombre</span>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan" maxLength={40} autoFocus autoComplete="given-name" />
            </label>
            {mode === "create" ? (
              <>
                <label className="flex flex-col gap-1.5"><span className="label">Nombre de la libreta</span>
                  <input className="field" value={hhName} onChange={(e) => setHhName(e.target.value)} placeholder="Ej: Casa Pérez" maxLength={40} />
                </label>
                <label className="flex flex-col gap-1.5"><span className="label">Moneda</span>
                  <select className="field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
                  </select>
                </label>
                <p className="text-[13px] text-ink-3">Arrancamos con categorías pensadas para una familia (súper, servicios, salud…). Las pueden cambiar cuando quieran.</p>
              </>
            ) : (
              <label className="flex flex-col gap-1.5"><span className="label">Código de invitación</span>
                <input className="field num text-center font-display text-[24px] font-bold tracking-[0.35em] uppercase" value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" autoCapitalize="characters" />
              </label>
            )}
            {error && <p role="alert" className="rounded-xl bg-neg-soft px-3 py-2 text-[14px] text-neg">{error}</p>}
            <button className="btn btn-primary btn-lg" disabled={busy || !name.trim() || (mode === "join" && code.length !== 6)}>
              {busy ? "Un momento…" : mode === "create" ? "Crear libreta" : "Unirme"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
