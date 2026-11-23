"use client";

import { useState } from "react";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/Sheet";
import { useHousehold } from "@/store/household";
import { parseAmount } from "@/lib/money";
import { goalPlan } from "@/lib/finance/engine";
import type { Goal } from "@/lib/types";

export type GoalDraft = Partial<Goal>;

export function GoalSheet({ open, onOpenChange, draft }: { open: boolean; onOpenChange: (o: boolean) => void; draft: GoalDraft | null }) {
  const hh = useHousehold();
  const editing = Boolean(draft?.id);
  const [name, setName] = useState(draft?.name ?? "");
  const [target, setTarget] = useState(draft?.target_amount ? String(Math.round(draft.target_amount)) : "");
  const [saved, setSaved] = useState(draft?.saved_amount ? String(draft.saved_amount) : "");
  const [date, setDate] = useState(draft?.target_date ?? "");

  const t = parseAmount(target);
  const s = saved ? parseAmount(saved) : 0;
  const valid = name.trim() && t > 0 && !Number.isNaN(s);
  const preview = valid ? goalPlan({ ...(draft as Goal), target_amount: t, saved_amount: s || 0, target_date: date || null }, hh.today) : null;

  async function save() {
    if (!valid) return;
    const ok = await hh.saveGoal({ ...draft, name, target_amount: t, saved_amount: s || 0, target_date: date || null, kind: draft?.kind ?? "goal" });
    if (ok) { toast.success(editing ? "Meta actualizada" : "Meta creada"); onOpenChange(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={editing ? "Editar meta" : draft?.kind === "emergency" ? "Fondo de emergencia" : "Nueva meta"}
      headerRight={editing ? (
        <button type="button" className="btn btn-sm" onClick={async () => { if (await hh.saveGoal({ ...(draft as Goal), archived: true })) { toast("Meta archivada"); onOpenChange(false); } }}>
          <Archive size={16} /> Archivar
        </button>
      ) : undefined}
      footer={<button type="button" className="btn btn-primary btn-lg w-full" disabled={!valid} onClick={save}>{editing ? "Guardar cambios" : "Crear meta"}</button>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className="label">Nombre</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Vacaciones de invierno" maxLength={60} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5"><span className="label">Objetivo</span>
            <input className="field num" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
          <label className="flex flex-col gap-1.5"><span className="label">Ya tienen ahorrado</span>
            <input className="field num" value={saved} onChange={(e) => setSaved(e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5"><span className="label">¿Para cuándo? (opcional)</span>
          <input className="field" type="date" value={date} min={hh.today} onChange={(e) => setDate(e.target.value)} />
        </label>
        {preview?.monthly != null && preview.remaining > 0 && (
          <p className="rounded-2xl bg-accent-soft px-4 py-3 text-[14px] text-accent">
            Necesitan apartar <b className="num">{hh.fmt(Math.ceil(preview.monthly))}</b> por mes durante {preview.months} {preview.months === 1 ? "mes" : "meses"}.
          </p>
        )}
        {draft?.kind === "emergency" && (
          <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
            Guárdenlo en algo líquido y de bajo riesgo (cuenta remunerada, plazo fijo corto, fondo money market), separado de la cuenta del día a día. No es para invertir ni para gastos planificados.
          </p>
        )}
      </div>
    </Sheet>
  );
}
