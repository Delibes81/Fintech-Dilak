"use client";
import { AnimatePresence, motion } from "motion/react";
import { Repeat, Target } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Avatar } from "@/components/ui/Avatar";
import { useHousehold } from "@/store/household";
import { useUi } from "@/store/ui";
import { dayLabel } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { Tx } from "@/lib/types";

export function TxRow({ tx, showDate, index = 0 }: { tx: Tx; showDate?: boolean; index?: number }) {
  const { categories, members, fmt, today } = useHousehold();
  const { openEditTx } = useUi();
  const c = categories.find((x) => x.id === tx.category_id);
  const who = members.find((m) => m.user_id === tx.created_by);
  return (
    <motion.button type="button" onClick={() => openEditTx(tx)} layout="position"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
      transition={{ delay: Math.min(index, 10) * 0.03, type: "spring", stiffness: 380, damping: 32 }}
      className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2">
      <CategoryIcon category={c} size={40} className="transition-transform group-hover:scale-105" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium">{tx.note || c?.name || "Movimiento"}</p>
        <p className="flex items-center gap-1.5 truncate text-[12.5px] text-ink-3">
          {tx.recurring_id && <Repeat size={11} className="shrink-0 text-accent" aria-label="Fijo" />}
          {tx.goal_id && <Target size={11} className="shrink-0 text-accent" aria-label="Meta" />}
          <span className="truncate">{c?.name ?? "Sin categoría"}{showDate ? ` · ${dayLabel(tx.occurred_on, today)}` : ""}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn("num text-[15px] font-semibold", tx.kind === "income" ? "text-pos" : "text-ink")}>
          {tx.kind === "income" ? "+" : "−"}{fmt(tx.amount)}
        </span>
        <Avatar member={who} size={16} />
      </div>
    </motion.button>
  );
}

/** Movimientos agrupados por día, con el neto de cada día. */
export function TxGrouped({ txs }: { txs: Tx[] }) {
  const { fmt, today } = useHousehold();
  const groups: { day: string; items: Tx[] }[] = [];
  for (const t of txs) {
    const g = groups[groups.length - 1];
    if (g && g.day === t.occurred_on) g.items.push(t);
    else groups.push({ day: t.occurred_on, items: [t] });
  }
  let n = 0;
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const net = g.items.reduce((a, t) => a + (t.kind === "income" ? t.amount : -t.amount), 0);
        return (
          <div key={g.day}>
            <div className="flex items-baseline justify-between px-2 pb-1.5">
              <span className="eyebrow">{dayLabel(g.day, today)}</span>
              <span className={cn("num text-[12.5px]", net >= 0 ? "text-pos" : "text-ink-3")}>{fmt(net, { sign: true })}</span>
            </div>
            <div className="card divide-y divide-line/60 p-1.5">
              <AnimatePresence initial={false}>{g.items.map((t) => <TxRow key={t.id} tx={t} index={n++} />)}</AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
