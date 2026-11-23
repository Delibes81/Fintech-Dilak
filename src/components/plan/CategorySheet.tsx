"use client";

import { Segmented } from "@/components/ui/Segmented";
import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/Sheet";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/components/ui/icons";
import { useHousehold } from "@/store/household";
import type { Bucket, Category, Kind } from "@/lib/types";

export type CategoryDraft = Partial<Category>;

export function CategorySheet({ open, onOpenChange, draft }: { open: boolean; onOpenChange: (o: boolean) => void; draft: CategoryDraft | null }) {
  const hh = useHousehold();
  const editing = Boolean(draft?.id);
  const [name, setName] = useState(draft?.name ?? "");
  const [kind, setKind] = useState<Kind>(draft?.kind ?? "expense");
  const [bucket, setBucket] = useState<Bucket>((draft?.bucket ?? "want") as Bucket);
  const [icon, setIcon] = useState(draft?.icon ?? "tag");
  const [color, setColor] = useState(draft?.color ?? "blue");
  const [keywords, setKeywords] = useState((draft?.keywords ?? []).join(", "));

  async function save(extra: Partial<Category> = {}) {
    if (!name.trim()) return;
    const ok = await hh.saveCategory({
      ...draft, name, kind, bucket: kind === "income" ? null : bucket, icon, color,
      keywords: keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean), ...extra,
    });
    if (ok) { toast.success(extra.archived ? "Categoría archivada" : extra.archived === false ? "Categoría restaurada" : "Categoría guardada"); onOpenChange(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={editing ? "Editar categoría" : "Nueva categoría"}
      headerRight={editing ? (
        <button type="button" className="btn btn-sm" onClick={() => save({ archived: !draft?.archived })}>
          {draft?.archived ? <><ArchiveRestore size={16} /> Restaurar</> : <><Archive size={16} /> Archivar</>}
        </button>
      ) : undefined}
      footer={<button type="button" className="btn btn-primary btn-lg w-full" disabled={!name.trim()} onClick={() => save()}>Guardar</button>}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <CategoryIcon category={{ icon, color }} size={52} />
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" maxLength={30} aria-label="Nombre" />
        </div>
        {!editing && (
          <Segmented full label="Tipo" value={kind} onChange={setKind} options={[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }]} />
        )}
        {kind === "expense" && draft?.bucket !== "saving" && (
          <div className="flex flex-col gap-1.5">
            <span className="label">Tipo de gasto (regla 50/30/20)</span>
            <Segmented full label="Tipo de gasto" value={bucket as "need" | "want"} onChange={setBucket} options={[{ value: "need", label: "Necesidad" }, { value: "want", label: "Deseo" }]} />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="label">Ícono</span>
          <div className="grid grid-cols-8 gap-1.5">
            {Object.entries(CATEGORY_ICONS).map(([k, Icon]) => (
              <button key={k} type="button" onClick={() => setIcon(k)} aria-label={k} aria-pressed={icon === k}
                className={`grid aspect-square place-items-center rounded-xl ${icon === k ? "bg-ink text-bg" : "bg-surface-2 text-ink-2"}`}>
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="label">Color</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} aria-pressed={color === c}
                className={`size-9 rounded-full ring-offset-2 ring-offset-[var(--surface)] ${color === c ? "ring-2 ring-ink" : ""}`} style={{ background: `var(--cat-${c})` }} />
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="label">Palabras que la detectan</span>
          <input className="field" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Ej: don Chucho, tianguis del martes" />
          <span className="text-[12.5px] text-ink-3">Separadas por coma. Dilak ya reconoce comercios y productos comunes (Oxxo, Telcel, Pemex, croquetas, tortillas…) y aprende de cada corrección; sumá acá solo lo que no adivine.</span>
        </label>
      </div>
    </Sheet>
  );
}
