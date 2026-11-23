"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

/** Cambio de contraseña de la persona que está usando la app. */
export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const strength = pw.length >= 12 && /\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw) ? 3 : pw.length >= 10 ? 2 : pw.length >= 8 ? 1 : 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) { setError("Usá al menos 8 caracteres."); return; }
    if (pw !== pw2) { setError("Las dos contraseñas no coinciden."); return; }
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setError(error.message?.toLowerCase().includes("different") ? "La nueva contraseña tiene que ser distinta de la actual." : "No se pudo cambiar. Probá de nuevo.");
      return;
    }
    toast.success("Contraseña actualizada");
    setPw(""); setPw2(""); setOpen(false);
  }

  if (!open)
    return (
      <button type="button" className="btn w-full justify-start" onClick={() => setOpen(true)}>
        <KeyRound size={17} /> Cambiar mi contraseña
      </button>
    );

  return (
    <AnimatePresence>
      <motion.form onSubmit={save} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5"><span className="label">Nueva contraseña</span>
          <div className="relative">
            <input className="field pr-11" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar" : "Mostrar"}
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:bg-surface-3">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className="h-1 flex-1 rounded-full bg-surface-3 transition-colors"
              style={{ background: strength >= n ? (strength === 3 ? "var(--pos)" : strength === 2 ? "var(--accent)" : "var(--warn)") : undefined }} />
          ))}
        </div>
        <label className="flex flex-col gap-1.5"><span className="label">Repetila</span>
          <input className="field" type={show ? "text" : "password"} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </label>
        {error && <p role="alert" className="rounded-xl bg-neg-soft px-3 py-2 text-[13.5px] text-neg">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn" onClick={() => { setOpen(false); setError(""); }}>Cancelar</button>
          <button className="btn btn-primary flex-1" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button>
        </div>
      </motion.form>
    </AnimatePresence>
  );
}
