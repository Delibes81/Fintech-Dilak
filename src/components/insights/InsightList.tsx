"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { Insight, Tone } from "@/lib/finance/engine";
import { cn } from "@/lib/cn";

const TONE: Record<Tone, { icon: typeof Info; cls: string; bar: string; label: string }> = {
  critical: { icon: CircleAlert, cls: "bg-neg-soft text-neg", bar: "bg-neg", label: "Atención" },
  warning: { icon: TriangleAlert, cls: "bg-warn-soft text-warn", bar: "bg-warn", label: "Aviso" },
  info: { icon: Info, cls: "bg-accent-soft text-accent", bar: "bg-accent", label: "Consejo" },
  good: { icon: CircleCheck, cls: "bg-pos-soft text-pos", bar: "bg-pos", label: "Bien" },
};

export function InsightList({ items, compact }: { items: Insight[]; compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i, idx) => {
        const t = TONE[i.tone];
        const Icon = t.icon;
        const body = (
          <div className="flex gap-3">
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", t.cls)} aria-label={t.label}><Icon size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] leading-snug font-medium">{i.title}</p>
              <p className={cn("mt-0.5 text-[13px] text-ink-2", compact && "line-clamp-2")}>{i.body}</p>
            </div>
            {i.href && <ArrowUpRight size={16} className="mt-0.5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />}
          </div>
        );
        const cls = "group relative block overflow-hidden rounded-2xl border border-line bg-surface-2/50 p-3 pl-4 transition-colors hover:bg-surface-2";
        return (
          <motion.li key={i.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + idx * 0.06 }}>
            {i.href ? (
              <Link href={i.href} className={cls}><span className={cn("absolute inset-y-0 left-0 w-[3px]", t.bar)} />{body}</Link>
            ) : (
              <div className={cls}><span className={cn("absolute inset-y-0 left-0 w-[3px]", t.bar)} />{body}</div>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
