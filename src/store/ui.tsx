"use client";
import { createContext, useContext } from "react";
import type { NewTx, Tx } from "@/lib/types";

export interface UiCtx {
  openNewTx: (prefill?: Partial<NewTx>) => void;
  openEditTx: (tx: Tx) => void;
  /** Dictar un movimiento por voz. */
  openVoice: () => void;
}
export const UiContext = createContext<UiCtx | null>(null);
export function useUi() {
  const v = useContext(UiContext);
  if (!v) throw new Error("useUi debe usarse dentro de AppShell");
  return v;
}
