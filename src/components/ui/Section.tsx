import type { ReactNode } from "react";
import { SpotlightCard } from "@/components/motion/Spotlight";
import { cn } from "@/lib/cn";

/** Bloque con título. `card` lo envuelve en tarjeta con halo. */
export function Section({ title, eyebrow, aside, children, card = true, className = "" }: {
  title?: ReactNode; eyebrow?: string; aside?: ReactNode; children: ReactNode; card?: boolean; className?: string;
}) {
  const head = (title || aside) && (
    <div className="mb-4 flex items-end gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        {title && <h2 className="truncate text-[16.5px] font-semibold tracking-tight">{title}</h2>}
      </div>
      {aside && <div className="ml-auto shrink-0 text-[13px] font-medium text-ink-2">{aside}</div>}
    </div>
  );
  if (!card) return <section className={className}>{head}{children}</section>;
  return <SpotlightCard className={cn("p-4 sm:p-5", className)}>{head}{children}</SpotlightCard>;
}
