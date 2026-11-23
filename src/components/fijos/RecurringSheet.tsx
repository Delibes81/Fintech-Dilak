"use client";

import { Segmented } from "@/components/ui/Segmented";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/Sheet";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useHousehold } from "@/store/household";
import { parseAmount } from "@/lib/money";
import { MONTHS } from "@/lib/dates";
import type { Recurring } from "@/lib/types";

export type RecurringDraft = Partial<Recurring> & { name?: string };

export function RecurringSheet({ open, onOpenChange, draft }: { open: boolean; onOpenChange: (o: boolean) => void; draft: RecurringDraft | null }) {
  const hh = useHousehold();
  const editing = Boolean(draft?.id);
  // Se remonta con key nueva al abrir: el estado nace del borrador.
  const [name, setName] = useState(draft?.name ?? "");
  const [amount, setAmount] = useState(draft?.amount ? String(draft.amount).replace(".", ",") : "");
  const [categoryId, setCategoryId] = useState<string | null>(draft?.category_id ?? null);
  const [frequency, setFrequency] = useState<"monthly" | "yearly">(draft?.frequency ?? "monthly");
  const [day, setDay] = useState(String(draft?.due_day ?? 10));
  const [month, setMonth] = useState(() => draft?.due_month ?? new Date().getMonth() + 1);
  const [active, setActive] = useState(draft?.active ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cats = hh.categories.filter((c) => c.kind === "expense" && !c.archived && c.bucket !== "saving");
  const value = parseAmount(amount);
  const valid = name.trim().length > 0 && value > 0;

  async function save() {
    if (!valid) return;
    const ok = await hh.saveRecurring({
      id: draft?.id, name, amount: value, category_id: categoryId, frequency,
      due_day: Math.min(31, Math.max(1, parseInt(day, 10) || 1)), due_month: frequency === "yearly" ? month : null, active,
    });
    if (ok) { toast.success(editing ? "Fijo actualizado" : `${name.trim()} agregado a los fijos`); onOpenChange(false); }
  }

  async function remove() {
    if (!draft?.id) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    const ok = await hh.deleteRecurring(draft as Recurring);
    if (ok) { toast("Fijo eliminado. Los pagos ya cargados se conservan."); onOpenChange(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={editing ? "Editar fijo" : "Nuevo fijo"}
      headerRight={editing ? (
        <button type="button" className={`btn btn-sm ${confirmDelete ? "border-neg bg-neg text-white" : "btn-danger"}`} onClick={remove}>
          <Trash2 size={16} /> {confirmDelete ? "¿Seguro?" : "Eliminar"}
        </button>
      ) : undefined}
      footer={<button type="button" className="btn btn-primary btn-lg w-full" disabled={!valid} onClick={save}>{editing ? "Guardar cambios" : "Agregar fijo"}</button>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className="label">Nombre</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Internet" maxLength={60} autoFocus={!editing && !draft?.name} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5"><span className="label">Monto</span>
            <input className="field num" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" autoFocus={!editing && Boolean(draft?.name)} />
          </label>
          <label className="flex flex-col gap-1.5"><span className="label">Vence el día</span>
            <input className="field num" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="10" />
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="label">Frecuencia</span>
          <Segmented full label="Frecuencia" value={frequency} onChange={setFrequency}
            options={[{ value: "monthly", label: "Todos los meses" }, { value: "yearly", label: "Una vez al año" }]} />
        </div>
        {frequency === "yearly" && (
          <label className="flex flex-col gap-1.5"><span className="label">Mes en que se paga</span>
            <select className="field capitalize" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </label>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="label">Categoría</span>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button key={c.id} type="button" className="chip h-10 pl-1.5" data-on={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                <CategoryIcon category={c} size={26} /> {c.name}
              </button>
            ))}
          </div>
        </div>
        {editing && (
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
            <span><span className="block font-semibold">Activo</span><span className="block text-[13px] text-ink-2">Pausalo si lo dieron de baja temporalmente</span></span>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-5 accent-[var(--accent)]" />
          </label>
        )}
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
          Si el monto cambia cada mes (luz, gas, tarjeta), poné uno aproximado. Al pagarlo podés corregirlo con el lápiz.
        </p>
      </div>
    </Sheet>
  );
}
