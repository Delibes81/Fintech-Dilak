import type { ReactNode } from "react";

/** Bloque con título. `card` lo envuelve en tarjeta. */
export function Section({ title, aside, children, card = true, className = "" }: {
  title?: ReactNode; aside?: ReactNode; children: ReactNode; card?: boolean; className?: string;
}) {
  return (
    <section className={`${card ? "card p-4 sm:p-5" : ""} ${className}`}>
      {(title || aside) && (
        <div className="mb-3 flex items-baseline gap-3">
          {title && <h2 className="font-display text-[17px] font-bold tracking-tight">{title}</h2>}
          {aside && <div className="ml-auto text-[13.5px] font-semibold text-ink-2">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
