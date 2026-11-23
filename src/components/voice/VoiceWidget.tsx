"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Mic } from "lucide-react";
import { useUi } from "@/store/ui";

const PHRASES = ["“Gasté 12 mil en farmacia”", "“Ayer 500 de gasolina”", "“Cobré la quincena, 18 mil”", "“Tacos 350”"];

/** Atajo del inicio: tocar y decir el gasto. */
export function VoiceWidget() {
  const { openVoice } = useUi();
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % PHRASES.length), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.button type="button" onClick={openVoice} whileTap={{ scale: 0.98 }} aria-label="Dictar un gasto por voz"
      className="group card beam relative flex w-full items-center gap-3.5 overflow-hidden p-3 pr-4 text-left">
      <span className="relative grid size-12 shrink-0 place-items-center">
        <motion.span className="absolute inset-0 rounded-2xl bg-accent/30" animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }} />
        <span className="relative grid size-12 place-items-center rounded-2xl bg-gradient-accent text-white shadow-glow"><Mic size={22} /></span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">Dictá un movimiento</span>
        <span className="relative block h-5 overflow-hidden text-[13px] text-ink-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={i} className="absolute inset-0 truncate" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}>
              {PHRASES[i]}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
      <ArrowRight size={18} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-1" />
    </motion.button>
  );
}
