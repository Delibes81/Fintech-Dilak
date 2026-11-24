"use client";
import { createContext, useContext } from "react";
import type { NewTx, Tx } from "@/lib/types";

export interface UiCtx {
  openNewTx: (prefill?: Partial<NewTx>) => void;
  openEditTx: (tx: Tx) => void;
  /**
   * Dictar un movimiento por voz. Llamarlo directo desde el toque: el micrófono arranca en ese
   * mismo gesto (en iPhone, si arranca después, "escucha" pero no capta audio).
   * `auto`: lo abrió la app sola (atajo, mantener apretado), no un toque.
   */
  openVoice: (opts?: { auto?: boolean }) => void;
}
export const UiContext = createContext<UiCtx | null>(null);
export function useUi() {
  const v = useContext(UiContext);
  if (!v) throw new Error("useUi debe usarse dentro de AppShell");
  return v;
}
