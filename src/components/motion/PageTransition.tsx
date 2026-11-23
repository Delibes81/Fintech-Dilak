import { ViewTransition, type ReactNode } from "react";

/**
 * Desliza la pantalla al navegar entre secciones (izquierda/derecha según el orden de las pestañas).
 * Usa la View Transitions API del navegador vía React; sin soporte, simplemente no anima.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
