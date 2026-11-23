"use client";
import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Option<T extends string> { value: T; label: ReactNode; className?: string }

/** Selector segmentado con indicador que se desliza (layout animation). */
export function Segmented<T extends string>({ options, value, onChange, className, full, label }: {
  options: Option<T>[]; value: T; onChange: (v: T) => void; className?: string; full?: boolean; label?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("relative inline-flex gap-0.5 rounded-[13px] border border-line bg-surface-2 p-[3px]", full && "flex w-full", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cn("relative z-0 flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] px-3.5 text-[13.5px] font-semibold transition-colors", full && "flex-1", on ? "text-ink" : "text-ink-3 hover:text-ink-2", on && o.className)}>
            {on && (
              <motion.span layoutId={`seg-${id}`} className="absolute inset-0 -z-10 rounded-[10px] border border-line bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.2)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
