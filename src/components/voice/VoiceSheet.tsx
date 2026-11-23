"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Keyboard, Mic, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/Sheet";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useHousehold } from "@/store/household";
import { speechErrorText, useSpeech, useSpeechSupported } from "@/hooks/useSpeech";
import { parseSpoken, type VoiceResult } from "@/lib/voice";
import { rankCategories } from "@/lib/smart";
import { dayLabel } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { NewTx } from "@/lib/types";

const EXAMPLES = ["“Gasté 12 mil en farmacia”", "“Ayer 500 de gasolina”", "“Cobré la quincena, 18 mil”", "“Súper 2 mil 300 categoría supermercado”"];

/** Dictar un movimiento: escuchar → confirmar → guardar. */
export function VoiceSheet({ open, onOpenChange, onManual }: {
  open: boolean; onOpenChange: (o: boolean) => void; onManual: (prefill?: Partial<NewTx>) => void;
}) {
  const hh = useHousehold();
  const supported = useSpeechSupported();
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [example, setExample] = useState(0);
  const speech = useSpeech((text) => setResult(parseSpoken(text, hh.categories, hh.history, hh.today)));

  // Empieza a escuchar apenas se abre (todavía dentro del gesto que la abrió)
  const { start, cancel } = speech;
  useEffect(() => {
    if (open && supported) start();
    return () => cancel();
  }, [open, supported, start, cancel]);

  useEffect(() => {
    if (speech.status !== "listening") return;
    const t = setInterval(() => setExample((e) => (e + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(t);
  }, [speech.status]);

  async function save() {
    if (!result?.amount) return;
    setSaving(true);
    const tx = await hh.addTx({
      kind: result.kind, amount: result.amount, category_id: result.category?.id ?? null,
      note: result.note || result.category?.name || (result.kind === "income" ? "Ingreso" : "Gasto"), occurred_on: result.date,
    });
    setSaving(false);
    if (!tx) return;
    toast.success(`${result.kind === "income" ? "Ingreso" : "Gasto"} guardado · ${hh.fmt(tx.amount)}`, {
      description: tx.note, action: { label: "Deshacer", onClick: () => { void hh.deleteTx(tx); } },
    });
    onOpenChange(false);
  }

  function retry() { setResult(null); speech.start(); }
  function manual() {
    onOpenChange(false);
    onManual(result ? { kind: result.kind, amount: result.amount ?? undefined, note: result.note, category_id: result.category?.id ?? null, occurred_on: result.date } : undefined);
  }

  const listening = speech.status === "listening";
  const alternatives = result ? rankCategories(hh.categories, hh.history, result.kind).slice(0, 8) : [];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) speech.cancel(); onOpenChange(o); }} title="Dictar movimiento" hideTitle
      footer={result ? (
        result.amount ? (
          <div className="flex gap-2">
            <button type="button" className="btn btn-lg w-14 shrink-0 px-0" onClick={retry} aria-label="Dictar de nuevo"><RotateCcw size={20} /></button>
            <button type="button" className="btn btn-lg w-14 shrink-0 px-0 sm:w-auto sm:px-4" onClick={manual} aria-label="Corregir a mano">
              <Keyboard size={18} /> <span className="hidden sm:inline">Corregir</span>
            </button>
            <button type="button" className="btn btn-primary btn-lg min-w-0 flex-1 px-3" disabled={saving} onClick={save}>
              <Check size={20} className="shrink-0" /> <span className="num truncate">{saving ? "Guardando…" : `Guardar ${hh.fmt(result.amount)}`}</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="btn btn-lg flex-1" onClick={manual}><Keyboard size={18} /> Cargar a mano</button>
            <button type="button" className="btn btn-primary btn-lg flex-1" onClick={retry}><Mic size={18} /> Repetir</button>
          </div>
        )
      ) : undefined}>
      <div className="flex min-h-[340px] flex-col items-center pb-2 text-center">
        <AnimatePresence mode="wait" initial={false}>
          {!supported ? (
            <motion.div key="unsupported" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 pt-6">
              <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-ink-3"><Mic size={28} /></span>
              <p className="text-[17px] font-semibold">Este navegador no transcribe voz</p>
              <p className="max-w-[34ch] text-[14px] text-ink-2">
                Usá el <b className="text-ink">micrófono del teclado</b> en el campo “¿En qué?”: decí por ejemplo <i>“súper 2 mil 300”</i> y Dilak completa el monto y la categoría solo.
              </p>
              <button type="button" className="btn btn-primary mt-2" onClick={manual}><Keyboard size={18} /> Abrir la carga</button>
            </motion.div>
          ) : result ? (
            <motion.div key="result" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex w-full flex-col items-center gap-4 pt-2">
              <p className="max-w-full truncate text-[13px] text-ink-3">Escuché: <span className="text-ink-2">“{result.transcript}”</span></p>
              {result.amount ? (
                <>
                  <span className={cn("pill", result.kind === "income" ? "pill-pos" : "pill-neg")}>{result.kind === "income" ? "Ingreso" : "Gasto"} · {dayLabel(result.date, hh.today)}</span>
                  <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    className={cn("num text-[48px] leading-none font-semibold tracking-[-0.05em]", result.kind === "income" && "text-pos")}>
                    {result.kind === "income" ? "+" : "−"}{hh.fmt(result.amount)}
                  </motion.p>
                  <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3">
                    <CategoryIcon category={result.category} size={40} />
                    <div className="min-w-0 text-left">
                      <p className="truncate text-[16px] font-semibold">{result.note || "Sin detalle"}</p>
                      <p className="text-[13px] text-ink-2">{result.category?.name ?? "Sin categoría"}</p>
                    </div>
                  </div>
                  <div className="w-full">
                    <p className="eyebrow mb-2 text-left">¿Otra categoría?</p>
                    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
                      {alternatives.map((c) => (
                        <button key={c.id} type="button" className="chip h-10 shrink-0 pl-1.5" data-on={c.id === result.category?.id}
                          onClick={() => setResult({ ...result, category: c, kind: c.kind })}>
                          <CategoryIcon category={c} size={26} /> {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 pt-6">
                  <p className="text-[17px] font-semibold">No escuché el monto</p>
                  <p className="max-w-[32ch] text-[14px] text-ink-2">Probá decir el número y el concepto juntos, por ejemplo {EXAMPLES[0]}.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="listen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-5 pt-4">
              <MicOrb active={listening} onClick={() => (listening ? speech.stop() : speech.start())} />
              <div className="min-h-[64px] w-full">
                {listening ? (
                  speech.interim ? (
                    <p className="text-[20px] leading-snug font-medium text-balance">{speech.interim}</p>
                  ) : (
                    <>
                      <p className="text-[17px] font-semibold">Te escucho…</p>
                      <AnimatePresence mode="wait">
                        <motion.p key={example} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-1 text-[14px] text-ink-3">
                          Decí algo como {EXAMPLES[example]}
                        </motion.p>
                      </AnimatePresence>
                    </>
                  )
                ) : speech.error ? (
                  <p className="mx-auto max-w-[34ch] text-[14px] text-neg">{speechErrorText(speech.error)}</p>
                ) : (
                  <p className="text-[15px] text-ink-2">Tocá el micrófono y decí el gasto</p>
                )}
              </div>
              {listening ? (
                <button type="button" className="btn btn-sm" onClick={speech.stop}><Square size={13} /> Listo</button>
              ) : (
                <button type="button" className="btn btn-sm btn-ghost" onClick={manual}><Keyboard size={15} /> Prefiero escribir</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}

/** Botón de micrófono con ondas que laten mientras escucha. */
export function MicOrb({ active, onClick, size = 104 }: { active: boolean; onClick: () => void; size?: number }) {
  return (
    <button type="button" onClick={onClick} aria-label={active ? "Terminar de dictar" : "Empezar a dictar"} className="relative grid place-items-center" style={{ width: size * 1.7, height: size * 1.7 }}>
      {active && [0, 1, 2].map((i) => (
        <motion.span key={i} className="absolute rounded-full border border-accent/50 bg-accent/10" style={{ width: size, height: size }}
          initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.66, ease: "easeOut" }} />
      ))}
      <motion.span animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={{ duration: 1.2, repeat: active ? Infinity : 0 }}
        className="relative grid place-items-center rounded-full bg-gradient-accent text-white shadow-[0_20px_50px_-12px_var(--accent)]" style={{ width: size, height: size }}>
        {active ? <Bars /> : <Mic size={size * 0.38} strokeWidth={2.2} />}
      </motion.span>
    </button>
  );
}

function Bars() {
  return (
    <span className="flex h-10 items-center gap-1" aria-hidden="true">
      {[0.5, 0.9, 0.6, 1, 0.7].map((h, i) => (
        <motion.span key={i} className="w-1.5 rounded-full bg-white" initial={{ height: 8 }}
          animate={{ height: [8, 36 * h, 12, 30 * h, 8] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }} />
      ))}
    </span>
  );
}
