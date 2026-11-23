"use client";
import { useState } from "react";
import { Check, ChevronDown, Pencil, Undo2 } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Progress } from "@/components/ui/Progress";
import { useHousehold } from "@/store/household";
import { useUi } from "@/store/ui";
import type { DueItem } from "@/lib/finance/engine";
import { dayLabel } from "@/lib/dates";

const STATUS: Record<DueItem["status"], { text: (d: DueItem) => string; cls: string }> = {
  paid: { text: () => "Pagado", cls: "pill-pos" },
  overdue: { text: (d) => `Venció hace ${-d.daysLeft} ${d.daysLeft === -1 ? "día" : "días"}`, cls: "pill-neg" },
  today: { text: () => "Vence hoy", cls: "pill-warn" },
  soon: { text: (d) => `Vence en ${d.daysLeft} ${d.daysLeft === 1 ? "día" : "días"}`, cls: "pill-warn" },
  upcoming: { text: (d) => `Vence el ${Number(d.dueDate.slice(8))}`, cls: "" },
  missed: { text: () => "Sin marcar", cls: "pill-neg" },
};

/** Fijos del mes: un toque para marcarlos como pagados. */
export function DueList({ items, ym }: { items: DueItem[]; ym: string }) {
  const hh = useHousehold();
  const { openNewTx } = useUi();
  const paid = items.filter((d) => d.status === "paid");
  const pending = items.filter((d) => d.status !== "paid");
  const total = items.reduce((a, d) => a + (d.paidTx?.amount ?? d.recurring.amount), 0);
  const paidAmt = paid.reduce((a, d) => a + (d.paidTx?.amount ?? 0), 0);
  // Los pagados se pliegan para que la lista muestre primero lo que falta (salvo que no quede nada pendiente)
  const [showPaid, setShowPaid] = useState(false);
  const visible = showPaid || pending.length === 0 ? [...pending, ...paid] : pending;

  async function pay(d: DueItem) {
    const date = ym === hh.today.slice(0, 7) ? hh.today : d.dueDate;
    const tx = await hh.addTx({
      kind: "expense", amount: d.recurring.amount, category_id: d.recurring.category_id, note: d.recurring.name,
      occurred_on: date, recurring_id: d.recurring.id,
    });
    if (tx) toast.success(`${d.recurring.name} pagado`, { action: { label: "Deshacer", onClick: () => { void hh.deleteTx(tx); } } });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex-1"><Progress value={paidAmt} max={total} tone="pos" label="Fijos pagados" /></div>
        <span className="num shrink-0 text-[13px] font-semibold text-ink-2">{paid.length}/{items.length} · {hh.fmt(total - paidAmt)} por pagar</span>
      </div>
      <LayoutGroup>
      <ul className="flex flex-col">
        <AnimatePresence initial={false}>
        {visible.map((d) => {
          const c = hh.categories.find((x) => x.id === d.recurring.category_id);
          const s = STATUS[d.status];
          const isPaid = d.status === "paid";
          const amount = d.paidTx?.amount ?? d.recurring.amount;
          return (
            <motion.li key={d.recurring.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              className="flex items-center gap-3 border-t border-line/60 py-2.5 first:border-t-0">
              <CategoryIcon category={c} size={40} className={isPaid ? "opacity-50" : ""} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className={`min-w-0 flex-1 truncate font-semibold ${isPaid ? "text-ink-3" : ""}`}>{d.recurring.name}</p>
                  {isPaid ? (
                    <span className="num shrink-0 font-semibold text-ink-3">{hh.fmt(amount)}</span>
                  ) : (
                    <button type="button" title="Tocá para pagar otro monto"
                      aria-label={`${hh.fmt(amount)}. Pagar ${d.recurring.name} con otro monto`}
                      className="num flex shrink-0 items-center gap-1 font-semibold underline decoration-ink-3/40 decoration-dotted underline-offset-4"
                      onClick={() => openNewTx({ kind: "expense", amount: d.recurring.amount, category_id: d.recurring.category_id, note: d.recurring.name, occurred_on: ym === hh.today.slice(0, 7) ? hh.today : d.dueDate, recurring_id: d.recurring.id })}>
                      {hh.fmt(amount)} <Pencil size={12} className="text-ink-3" />
                    </button>
                  )}
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  <span className={`pill shrink-0 ${s.cls}`}>{s.text(d)}</span>
                  {isPaid && d.paidTx && <span className="truncate text-[12.5px] text-ink-3">{dayLabel(d.paidTx.occurred_on, hh.today)} · {hh.memberName(d.paidTx.created_by)}</span>}
                </div>
              </div>
              {isPaid ? (
                <button type="button" className="btn btn-sm btn-ghost w-[84px] shrink-0 px-2 text-ink-3" aria-label={`Desmarcar ${d.recurring.name}`} onClick={() => d.paidTx && hh.deleteTx(d.paidTx)}>
                  <Undo2 size={16} /> Desmarcar
                </button>
              ) : (
                <button type="button" className="btn btn-sm btn-primary w-[84px] shrink-0 px-2" onClick={() => pay(d)}>
                  <Check size={16} /> Pagar
                </button>
              )}
            </motion.li>
          );
        })}
        </AnimatePresence>
      </ul>
      {paid.length > 0 && pending.length > 0 && (
        <motion.button layout type="button" onClick={() => setShowPaid((v) => !v)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2">
          {showPaid ? "Ocultar pagados" : `Ver ${paid.length} ${paid.length === 1 ? "pagado" : "pagados"} · ${hh.fmt(paidAmt)}`}
          <motion.span animate={{ rotate: showPaid ? 180 : 0 }}><ChevronDown size={15} /></motion.span>
        </motion.button>
      )}
      </LayoutGroup>
    </div>
  );
}
