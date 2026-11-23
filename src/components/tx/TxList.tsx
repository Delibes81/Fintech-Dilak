"use client";
import { Repeat, Target } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Avatar } from "@/components/ui/Avatar";
import { useHousehold } from "@/store/household";
import { useUi } from "@/store/ui";
import { dayLabel } from "@/lib/dates";
import type { Tx } from "@/lib/types";

export function TxRow({ tx, showDate }: { tx: Tx; showDate?: boolean }) {
  const { categories, members, fmt, today } = useHousehold();
  const { openEditTx } = useUi();
  const c = categories.find((x) => x.id === tx.category_id);
  const who = members.find((m) => m.user_id === tx.created_by);
  return (
    <button type="button" onClick={() => openEditTx(tx)}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2">
      <CategoryIcon category={c} size={42} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{tx.note || c?.name || "Movimiento"}</p>
        <p className="flex items-center gap-1.5 truncate text-[13px] text-ink-2">
          {tx.recurring_id && <Repeat size={12} className="shrink-0 text-accent" aria-label="Fijo" />}
          {tx.goal_id && <Target size={12} className="shrink-0 text-accent" aria-label="Meta" />}
          <span className="truncate">{c?.name ?? "Sin categoría"}{showDate ? ` · ${dayLabel(tx.occurred_on, today)}` : ""}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={`num font-display text-[16px] font-bold tracking-tight ${tx.kind === "income" ? "text-pos" : "text-ink"}`}>
          {tx.kind === "income" ? "+" : "−"}{fmt(tx.amount)}
        </span>
        <Avatar member={who} size={18} />
      </div>
    </button>
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
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const net = g.items.reduce((a, t) => a + (t.kind === "income" ? t.amount : -t.amount), 0);
        return (
          <div key={g.day}>
            <div className="flex items-baseline justify-between px-2 pb-1">
              <span className="text-[13px] font-bold text-ink-2 first-letter:uppercase">{dayLabel(g.day, today)}</span>
              <span className={`num text-[13px] font-semibold ${net >= 0 ? "text-pos" : "text-ink-3"}`}>{fmt(net, { sign: true })}</span>
            </div>
            <div className="card divide-y divide-line/70 p-1.5">{g.items.map((t) => <TxRow key={t.id} tx={t} />)}</div>
          </div>
        );
      })}
    </div>
  );
}
