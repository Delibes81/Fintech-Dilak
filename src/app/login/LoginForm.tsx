"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import type { PublicProfile } from "@/lib/users";
import { signIn, type LoginState } from "./actions";

export function LoginForm({ profiles }: { profiles: PublicProfile[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { attempt: 0 });
  const [picked, setPicked] = useState<string | null>(profiles.length === 1 ? profiles[0].key : null);
  const [show, setShow] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);
  // Último perfil usado en este dispositivo (solo en el navegador; en el servidor no hay)
  const last = useSyncExternalStore(noopSubscribe, readLastProfile, () => null);
  const selected = picked ?? (profiles.some((p) => p.key === last) ? last : null);
  const chosen = profiles.find((p) => p.key === selected);

  useEffect(() => { if (selected) setTimeout(() => pwRef.current?.focus(), 180); }, [selected]);

  function pick(key: string) {
    setPicked(key);
    try { localStorage.setItem("dilak:last-profile", key); } catch { /* sin storage */ }
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="profile" value={selected ?? ""} />
      {/* Ayuda a los gestores de contraseñas a asociar la clave al perfil */}
      <input type="text" name="username" autoComplete="username" value={chosen?.name ?? ""} readOnly hidden />

      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Perfil">
        {profiles.map((p, i) => {
          const on = p.key === selected;
          return (
            <motion.button key={p.key} type="button" role="radio" aria-checked={on} onClick={() => pick(p.key)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: selected && !on ? 0.5 : 1, y: 0, scale: on ? 1 : selected ? 0.96 : 1 }}
              transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 300, damping: 24 }} whileTap={{ scale: 0.95 }}
              className={cn("card relative flex flex-col items-center gap-3 overflow-hidden px-3 py-6 text-center transition-colors", on && "border-accent/60")}>
              {on && <motion.span layoutId="profile-glow" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_70%)]" />}
              <span className={cn("rounded-full p-1 transition-shadow", on && "shadow-[0_0_0_2px_var(--accent),0_0_30px_-4px_var(--accent)]")}>
                <Avatar member={{ display_name: p.name, color: p.color }} size={64} />
              </span>
              <span className="text-[16px] font-semibold">{p.name}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {chosen && (
          <motion.div key="pw" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }} className="overflow-hidden">
            <motion.div key={state.attempt} animate={state.error ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}
              className="card mt-1 flex flex-col gap-3 p-4">
              <label className="flex flex-col gap-1.5">
                <span className="label">Contraseña de {chosen.name}</span>
                <div className="relative">
                  <LockKeyhole size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
                  <input ref={pwRef} name="password" type={show ? "text" : "password"} autoComplete="current-password" required minLength={6}
                    className="field pr-11 pl-10" placeholder="••••••••" aria-invalid={Boolean(state.error)} />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:bg-surface-3 hover:text-ink">
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              {state.error && <p role="alert" className="rounded-xl bg-neg-soft px-3 py-2 text-[13.5px] text-neg">{state.error}</p>}
              <button className="btn btn-primary btn-lg" disabled={pending}>
                {pending ? <><LoaderCircle size={18} className="animate-spin" /> Entrando…</> : <>Entrar <ArrowRight size={18} /></>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

const noopSubscribe = () => () => {};
function readLastProfile() {
  try { return localStorage.getItem("dilak:last-profile"); } catch { return null; }
}
