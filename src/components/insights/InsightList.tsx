import Link from "next/link";
import { ArrowUpRight, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { Insight, Tone } from "@/lib/finance/engine";

const TONE: Record<Tone, { icon: typeof Info; cls: string; label: string }> = {
  critical: { icon: CircleAlert, cls: "bg-neg-soft text-neg", label: "Atención" },
  warning: { icon: TriangleAlert, cls: "bg-warn-soft text-warn", label: "Aviso" },
  info: { icon: Info, cls: "bg-accent-soft text-accent", label: "Consejo" },
  good: { icon: CircleCheck, cls: "bg-pos-soft text-pos", label: "Bien" },
};

export function InsightList({ items, compact }: { items: Insight[]; compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => {
        const t = TONE[i.tone];
        const Icon = t.icon;
        const body = (
          <div className="flex gap-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${t.cls}`} aria-label={t.label}><Icon size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{i.title}</p>
              {!compact && <p className="mt-0.5 text-[14px] text-ink-2">{i.body}</p>}
              {compact && <p className="mt-0.5 line-clamp-2 text-[13.5px] text-ink-2">{i.body}</p>}
            </div>
            {i.href && <ArrowUpRight size={18} className="mt-1 shrink-0 text-ink-3" aria-hidden="true" />}
          </div>
        );
        return (
          <li key={i.id}>
            {i.href ? (
              <Link href={i.href} className="block rounded-2xl border border-line bg-surface p-3 transition-colors hover:bg-surface-2">{body}</Link>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
