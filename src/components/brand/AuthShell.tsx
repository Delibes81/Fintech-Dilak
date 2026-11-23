"use client";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { LogoMark } from "./Logo";

/** Fondo de las pantallas de acceso: auroras que flotan lento + cuadrícula. */
export function AuthShell({ title, subtitle, children }: { title: ReactNode; subtitle: ReactNode; children: ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-[max(20px,env(safe-area-inset-left))] py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <motion.div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(124_108_255/0.35),transparent_65%)] blur-2xl"
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -right-40 top-10 size-[30rem] rounded-full bg-[radial-gradient(circle,rgb(56_214_255/0.25),transparent_65%)] blur-2xl"
          animate={{ x: [0, -50, 0], y: [0, 60, 0] }} transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} />
      </div>
      <motion.div className="w-full max-w-[420px]" initial={{ opacity: 0, y: 16, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            className="mb-5 rounded-[20px] shadow-[0_0_60px_-10px_var(--accent)]">
            <LogoMark size={68} />
          </motion.div>
          <p className="eyebrow">Fintech Dilak</p>
          <h1 className="mt-2 text-[30px] leading-tight font-semibold">{title}</h1>
          <p className="mt-2 max-w-[34ch] text-[14.5px] text-ink-2">{subtitle}</p>
        </div>
        {children}
        <p className="mt-6 text-center font-mono text-[10.5px] tracking-[0.14em] text-ink-3 uppercase">Cifrado · Sincronizado en tiempo real</p>
      </motion.div>
    </main>
  );
}
