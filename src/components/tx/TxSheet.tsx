"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Mic, Plus, Sparkles, Trash2 } from "lucide-react";
import { amountInText, parseSpoken } from "@/lib/voice";
import { speechErrorText, useSpeech, useSpeechSupported } from "@/hooks/useSpeech";
import { AnimatePresence, motion } from "motion/react";
import { Segmented } from "@/components/ui/Segmented";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/Sheet";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { AmountDisplay, AmountPad, numberToPad, padToNumber, pressKey } from "./AmountPad";
import { useHousehold } from "@/store/household";
import { NO_CENTS } from "@/lib/money";
import { detectCategory, frequentEntries, rankCategories, SAVING_HINT } from "@/lib/smart";
import { dayLabel, shiftDays } from "@/lib/dates";
import type { Kind, NewTx, Tx } from "@/lib/types";

export type TxSheetMode = { type: "new"; prefill?: Partial<NewTx> } | { type: "edit"; tx: Tx };

export function TxSheet({ open, onOpenChange, mode }: { open: boolean; onOpenChange: (o: boolean) => void; mode: TxSheetMode }) {
  const hh = useHousehold();
  const { categories, history, today, household } = hh;
  const allowDecimal = !NO_CENTS.has(household.currency);

  // El padre remonta la hoja (key nueva) cada vez que la abre: el estado nace de `mode`.
  const init = mode.type === "edit"
    ? { kind: mode.tx.kind, amount: numberToPad(mode.tx.amount), note: mode.tx.note, cat: mode.tx.category_id, date: mode.tx.occurred_on, replace: true }
    : { kind: mode.prefill?.kind ?? "expense", amount: mode.prefill?.amount ? numberToPad(mode.prefill.amount) : "", note: mode.prefill?.note ?? "",
        cat: mode.prefill?.category_id ?? null, date: mode.prefill?.occurred_on ?? today, replace: Boolean(mode.prefill?.amount) };
  const isEditMode = mode.type === "edit";
  const [kind, setKind] = useState<Kind>(init.kind);
  const [amount, setAmount] = useState(init.amount);
  const [note, setNote] = useState(init.note);
  const [categoryId, setCategoryId] = useState<string | null>(init.cat);
  const [categoryTouched, setCategoryTouched] = useState(Boolean(init.cat));
  const [autoPicked, setAutoPicked] = useState(false);
  const [date, setDate] = useState(init.date);
  const [replaceOnType, setReplaceOnType] = useState(init.replace);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);

  const ranked = useMemo(() => rankCategories(categories, history, kind), [categories, history, kind]);
  const frequent = useMemo(() => frequentEntries(history).filter((f) => f.kind === kind), [history, kind]);
  const category = categories.find((c) => c.id === categoryId) ?? null;

  // Sugerir categoría a partir del detalle
  // Si el detalle trae un monto (dictado del teclado o escrito: "súper 2 mil 300") y el teclado
  // numérico no se usó, se completa solo. Al guardar, el número se quita del detalle.
  const [amountFromText, setAmountFromText] = useState(false);
  function onNote(v: string) {
    setNote(v);
    if (!isEditMode && (!amount || amountFromText)) {
      const a = amountInText(v);
      if (a) { setAmount(numberToPad(a)); setAmountFromText(true); }
      else if (amountFromText) { setAmount(""); setAmountFromText(false); }
    }
    if (categoryTouched) return;
    const c = detectCategory(v, categories.filter((x) => x.bucket !== "saving" || SAVING_HINT.test(v)), history);
    if (c) { setCategoryId(c.id); setKind(c.kind); setAutoPicked(true); }
    else if (autoPicked) { setCategoryId(null); setAutoPicked(false); }
  }

  // Dictado dentro de la hoja: completa monto, detalle, categoría, tipo y fecha
  const voiceSupported = useSpeechSupported();
  const speech = useSpeech((text) => {
    const v = parseSpoken(text, categories, history, today);
    if (v.amount) { setAmount(numberToPad(v.amount)); setReplaceOnType(true); setAmountFromText(false); }
    setNote(v.note);
    setKind(v.kind);
    setDate(v.date);
    if (v.category) { setCategoryId(v.category.id); setCategoryTouched(false); setAutoPicked(true); }
  });

  function onKey(k: string) {
    setAmountFromText(false);
    setAmount((v) => pressKey(replaceOnType && k !== "back" && k !== "dec" ? "" : v, k, allowDecimal));
    setReplaceOnType(false);
  }

  const value = padToNumber(amount);
  const canSave = value > 0 && !saving;

  async function save(keepOpen = false) {
    if (!canSave) return;
    setSaving(true);
    const fallback = categories.find((c) => c.kind === kind && !c.archived && c.bucket !== "saving" && c.sort >= 990)
      ?? categories.find((c) => c.kind === kind && !c.archived);
    const finalCat = category && category.kind === kind ? category : fallback ?? null;
    const cleanNote = amountFromText ? parseSpoken(note, categories, history, today).note : note.trim();
    const payload: NewTx = {
      kind, amount: value, category_id: finalCat?.id ?? null,
      note: cleanNote || finalCat?.name || (kind === "expense" ? "Gasto" : "Ingreso"), occurred_on: date,
    };
    if (mode.type === "edit") {
      const ok = await hh.updateTx(mode.tx.id, payload);
      setSaving(false);
      if (ok) { toast.success("Cambios guardados"); flashDone(() => onOpenChange(false)); }
      return;
    }
    const tx = await hh.addTx({ ...payload, ...(mode.prefill?.recurring_id && { recurring_id: mode.prefill.recurring_id }) });
    setSaving(false);
    if (!tx) return;
    toast.success(`${kind === "expense" ? "Gasto" : "Ingreso"} guardado · ${hh.fmt(tx.amount)}`, {
      description: tx.note,
      action: { label: "Deshacer", onClick: () => { void hh.deleteTx(tx); } },
    });
    if (keepOpen) {
      flashDone(() => { setAmount(""); setNote(""); setCategoryId(null); setCategoryTouched(false); setAutoPicked(false); });
    } else flashDone(() => onOpenChange(false));
  }

  // Confirmación visual breve (check animado) antes de cerrar o limpiar
  function flashDone(then: () => void) {
    setDone(true);
    setTimeout(() => { setDone(false); then(); }, 420);
  }

  async function remove() {
    if (mode.type !== "edit") return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    const t = mode.tx;
    const ok = await hh.deleteTx(t);
    if (ok) {
      onOpenChange(false);
      toast("Movimiento eliminado", { action: { label: "Deshacer", onClick: () => { void hh.restoreTx(t); } } });
    }
  }

  // Teclado físico (compu): números, coma, borrar y Enter
  useEffect(() => {
    if (!open) return;
    const onDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
      if (e.key === "Enter" && (!typing || el === noteRef.current)) { e.preventDefault(); void save(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) onKey(e.key);
      else if (e.key === "Backspace") onKey("back");
      else if (e.key === "," || e.key === ".") onKey("dec");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  });

  const yesterday = shiftDays(today, -1);
  const isEdit = mode.type === "edit";

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar movimiento" : kind === "expense" ? "Nuevo gasto" : "Nuevo ingreso"}
      hideTitle={!isEdit}
      headerRight={isEdit ? (
        <button type="button" className={`btn btn-sm ${confirmDelete ? "bg-neg text-white border-neg" : "btn-danger"}`} onClick={remove}>
          <Trash2 size={16} /> {confirmDelete ? "¿Eliminar? Tocá de nuevo" : "Eliminar"}
        </button>
      ) : undefined}
      footer={
        <div className="flex gap-2">
          {!isEdit && (
            <button type="button" className="btn btn-lg w-14 shrink-0 px-0" disabled={!canSave} onClick={() => save(true)}
              aria-label="Guardar y cargar otro" title="Guardar y cargar otro">
              <Plus size={22} />
            </button>
          )}
          <button type="button" className="btn btn-primary btn-lg relative flex-1 overflow-hidden" disabled={!canSave && !done} onClick={() => save(false)}>
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.span key="ok" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }} className="flex items-center gap-2">
                  <Check size={22} strokeWidth={3} /> Listo
                </motion.span>
              ) : (
                <motion.span key="label" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="num">
                  {saving ? "Guardando…" : isEdit ? "Guardar cambios" : value > 0 ? `Guardar ${hh.fmt(value)}` : "Ingresá el monto"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5 [@media(max-height:720px)]:gap-2.5">
        {/* Tipo y fecha */}
        <div className="flex items-center gap-2">
          <Segmented label="Tipo" value={kind}
            onChange={(k) => { setKind(k); if (category && category.kind !== k) { setCategoryId(null); setCategoryTouched(false); } }}
            options={[{ value: "expense", label: "Gasto", className: "!text-neg" }, { value: "income", label: "Ingreso", className: "!text-pos" }]} />
          <div className="no-scrollbar ml-auto flex gap-1.5 overflow-x-auto">
            <button type="button" className="chip h-[34px]" data-on={date === today} onClick={() => setDate(today)}>Hoy</button>
            <button type="button" className="chip h-[34px]" data-on={date === yesterday} onClick={() => setDate(yesterday)}>Ayer</button>
            <label className="chip relative h-[34px]" data-on={date !== today && date !== yesterday}>
              <CalendarDays size={15} />
              <span>{date !== today && date !== yesterday ? dayLabel(date, today) : "Otro"}</span>
              <input type="date" value={date} max={shiftDays(today, 366)} onChange={(e) => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0" aria-label="Elegir fecha" />
            </label>
          </div>
        </div>

        {/* Monto */}
        <AmountDisplay value={amount} currency={household.currency} tone={kind} />

        {/* Detalle con detección de categoría */}
        <div className="relative">
          {voiceSupported && (
            <button type="button" onClick={() => (speech.status === "listening" ? speech.stop() : speech.start())}
              aria-label={speech.status === "listening" ? "Terminar de dictar" : "Dictar el movimiento"}
              className={`absolute top-1/2 left-1.5 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-[10px] transition-colors ${speech.status === "listening" ? "bg-gradient-accent text-white" : "text-accent hover:bg-accent-soft"}`}>
              {speech.status === "listening" && <motion.span className="absolute inset-0 rounded-[10px] bg-accent/40" animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />}
              <Mic size={18} className="relative" />
            </button>
          )}
          <input
            ref={noteRef}
            value={speech.status === "listening" ? speech.interim : note}
            onChange={(e) => onNote(e.target.value)}
            readOnly={speech.status === "listening"}
            placeholder={speech.status === "listening" ? "Te escucho…" : kind === "expense" ? "¿En qué? Ej: súper, nafta" : "¿De dónde? Ej: sueldo"}
            className={`field ${voiceSupported ? "pl-12" : ""} ${category ? "pr-32" : ""}`}
            maxLength={80}
            enterKeyHint="done"
            aria-label="Detalle"
          />
          {category && (
            <span className="pointer-events-none absolute top-1/2 right-2 flex max-w-[45%] -translate-y-1/2 items-center gap-1 truncate rounded-full bg-surface px-2 py-1 text-[12.5px] font-semibold text-ink-2 shadow-sm">
              {autoPicked && <Sparkles size={13} className="shrink-0 text-accent" aria-label="Sugerida" />}
              <span className="truncate">{category.name}</span>
            </span>
          )}
        </div>
        {speech.status === "error" && <p className="-mt-2 text-[12.5px] text-neg">{speechErrorText(speech.error)}</p>}
        {amountFromText && <p className="-mt-2 flex items-center gap-1 text-[12.5px] text-accent"><Sparkles size={12} /> Tomé el monto del texto</p>}

        {/* Lo de siempre */}
        {!isEdit && frequent.length > 0 && !note && !amount && (
          <div>
            <p className="eyebrow mb-2">Lo de siempre</p>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {frequent.map((f) => {
                const c = categories.find((x) => x.id === f.categoryId);
                return (
                  <button key={`${f.note}-${f.categoryId}`} type="button" className="chip h-10 shrink-0 pl-1.5"
                    onClick={() => {
                      setNote(f.note); setCategoryId(f.categoryId); setCategoryTouched(true); setAutoPicked(false);
                      setAmount(numberToPad(f.lastAmount)); setReplaceOnType(true);
                    }}>
                    <CategoryIcon category={c} size={28} />
                    {f.note}
                    <span className="num text-[12.5px] font-medium text-ink-3">{hh.fmt(f.lastAmount)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categorías */}
        <div>
          <p className="eyebrow mb-2 [@media(max-height:720px)]:sr-only">Categoría</p>
          <div className="no-scrollbar -mx-5 grid auto-cols-[76px] grid-flow-col gap-x-1 overflow-x-auto px-5 [@media(min-height:900px)]:grid-rows-2 [@media(min-height:900px)]:gap-y-2" role="radiogroup" aria-label="Categoría">
            {ranked.map((c) => {
              const on = c.id === categoryId;
              return (
                <button key={c.id} type="button" role="radio" aria-checked={on}
                  onClick={() => { setCategoryId(on ? null : c.id); setCategoryTouched(!on); setAutoPicked(false); }}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2 transition-colors [@media(max-height:720px)]:gap-1 [@media(max-height:720px)]:py-1 ${on ? "" : "active:bg-surface-2"}`}>
                  {on && <motion.span layoutId="cat-on" className="absolute inset-0 -z-10 rounded-2xl border border-accent/50 bg-accent-soft shadow-[0_0_20px_-6px_var(--accent)]" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                  <motion.span animate={{ scale: on ? 1.08 : 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                    <CategoryIcon category={c} size={42} />
                  </motion.span>
                  <span className={`line-clamp-2 text-center text-[11.5px] leading-tight font-medium [@media(max-height:720px)]:line-clamp-1 ${on ? "text-accent" : "text-ink-2"}`}>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AmountPad onKey={onKey} allowDecimal={allowDecimal} />
      </div>
    </Sheet>
  );
}
