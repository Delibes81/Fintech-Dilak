"use client";
import type { ComponentProps, PointerEvent } from "react";
import { cn } from "@/lib/cn";

/** Tarjeta con un halo que sigue al puntero (solo con mouse; en táctil no hace nada). */
export function SpotlightCard({ className, onPointerMove, ...rest }: ComponentProps<"section">) {
  function move(e: PointerEvent<HTMLElement>) {
    if (e.pointerType === "mouse") {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
      e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
    }
    onPointerMove?.(e);
  }
  return <section className={cn("card spotlight", className)} onPointerMove={move} {...rest} />;
}
