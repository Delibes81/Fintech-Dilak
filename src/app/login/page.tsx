"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/supabase/env";

/**
 * Ingreso con código de un solo uso enviado por email.
 * Se usa código (y no link mágico) porque en el iPhone el link abre Safari
 * en vez de la app instalada; el código funciona en cualquier lado.
 */
export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Revisá el email: parece incompleto."); return; }
    setBusy(true);
    const { error } = await supabase().auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Pediste muchos códigos seguidos. Esperá un minuto y probá de nuevo." : "No pudimos enviar el código. Probá de nuevo en un rato.");
      return;
    }
    setStep("code"); setCooldown(60);
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verify(e?: React.FormEvent, value = code) {
    e?.preventDefault();
    if (value.length < 6) return;
    setBusy(true); setError("");
    const { error } = await supabase().auth.verifyOtp({ email: email.trim().toLowerCase(), token: value, type: "email" });
    if (error) { setBusy(false); setError("El código no es correcto o ya venció. Revisalo o pedí uno nuevo."); return; }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-[max(20px,env(safe-area-inset-left))] py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/icons/icon-192.png" alt="" width={72} height={72} className="mb-5 size-[72px] rounded-[22px] shadow-pop" />
          <h1 className="font-display text-[30px] font-extrabold tracking-tight">La Libreta de Casa</h1>
          <p className="mt-2 max-w-[30ch] text-ink-2">Las finanzas de la familia en un solo lugar, con consejos para que les rinda más.</p>
        </div>

        {!isConfigured && (
          <p className="mb-4 rounded-2xl bg-warn-soft p-4 text-[14px] text-warn">
            Falta configurar Supabase: completá <b>NEXT_PUBLIC_SUPABASE_URL</b> y <b>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</b> (ver README).
          </p>
        )}

        <div className="card p-5">
          {step === "email" ? (
            <form onSubmit={sendCode} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="label">Tu email</span>
                <input className="field" type="email" inputMode="email" autoComplete="email" autoFocus value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="nombre@email.com" />
              </label>
              <button className="btn btn-primary btn-lg" disabled={busy || !email}>{busy ? "Enviando…" : "Recibir código"}</button>
              <p className="text-center text-[13px] text-ink-3">Sin contraseñas: te mandamos un código de un solo uso.</p>
            </form>
          ) : (
            <form onSubmit={verify} className="flex flex-col gap-3">
              <button type="button" className="btn btn-sm btn-ghost self-start px-1" onClick={() => { setStep("email"); setCode(""); setError(""); }}>
                <ArrowLeft size={16} /> Cambiar email
              </button>
              <div className="flex items-start gap-3 rounded-2xl bg-accent-soft p-3 text-[14px] text-accent">
                <Mail size={18} className="mt-0.5 shrink-0" />
                <span>Te mandamos un código a <b>{email}</b>. Si no aparece, mirá en Spam o Promociones.</span>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="label">Código</span>
                <input ref={codeRef} className="field num text-center font-display text-[26px] font-bold tracking-[0.4em]" inputMode="numeric"
                  autoComplete="one-time-code" maxLength={10} value={code} placeholder="••••••"
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setCode(v); if (v.length === 6 || v.length === 8) void verify(undefined, v); }} />
              </label>
              <button className="btn btn-primary btn-lg" disabled={busy || code.length < 6}>{busy ? "Verificando…" : "Entrar"}</button>
              <button type="button" className="btn btn-sm btn-ghost" disabled={cooldown > 0 || busy} onClick={() => sendCode()}>
                {cooldown > 0 ? `Reenviar código en ${cooldown} s` : "Reenviar código"}
              </button>
            </form>
          )}
          {error && <p role="alert" className="mt-3 rounded-xl bg-neg-soft px-3 py-2 text-[14px] text-neg">{error}</p>}
        </div>
      </div>
    </main>
  );
}
