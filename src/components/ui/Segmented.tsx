"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Option<T extends string> { value: T; label: ReactNode; className?: string }

/**
 * Selector segmentado con un indicador que se desliza.
 * El indicador se mueve con `transform` (lo resuelve la GPU), así en el celular no se traba:
 * se mide la opción activa una vez y se le pasa la posición por variables CSS.
 */
export function Segmented<T extends string>({ options, value, onChange, className, full, label }: {
  options: Option<T>[]; value: T; onChange: (v: T) => void; className?: string; full?: boolean; label?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current, pill = pillRef.current;
    if (!root || !pill) return;
    const place = () => {
      const active = root.querySelector<HTMLElement>('[aria-checked="true"]');
      if (!active) { pill.style.opacity = "0"; return; }
      pill.style.setProperty("--x", `${active.offsetLeft}px`);
      pill.style.setProperty("--w", `${active.offsetWidth}px`);
      pill.style.opacity = "1";
      // La primera vez se ubica sin animar; después, cada cambio se desliza
      requestAnimationFrame(() => { pill.dataset.ready = "1"; });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(root);
    return () => ro.disconnect();
  }, [value, options.length]);

  return (
    <div ref={rootRef} role="radiogroup" aria-label={label} className={cn("relative isolate inline-flex gap-0.5 rounded-[13px] border border-line bg-surface-2 p-[3px]", full && "flex w-full", className)}>
      <span ref={pillRef} aria-hidden="true"
        className="pointer-events-none absolute top-[3px] bottom-[3px] left-0 -z-10 w-[var(--w)] translate-x-[var(--x)] rounded-[10px] border border-line bg-surface opacity-0 shadow-[0_1px_3px_rgb(0_0_0/0.2)] will-change-[translate] data-[ready]:transition-[translate,width] data-[ready]:duration-[260ms] data-[ready]:ease-[cubic-bezier(0.32,1.25,0.5,1)] motion-reduce:transition-none" />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cn("relative flex h-[34px] touch-manipulation items-center justify-center gap-1.5 rounded-[10px] px-3.5 text-[13.5px] font-semibold transition-colors select-none", full && "flex-1", on ? "text-ink" : "text-ink-3 hover:text-ink-2", on && o.className)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
