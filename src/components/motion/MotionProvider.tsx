"use client";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Respeta "reducir movimiento" del sistema en todas las animaciones de Motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 32 }}>
      {children}
    </MotionConfig>
  );
}
