"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Orden de las secciones (igual que el menú): define si la pantalla entra desde la derecha o la izquierda. */
const ORDER = ["/", "/movimientos", "/plan", "/analisis", "/ajustes"];
const indexOf = (path: string) => {
  const i = ORDER.findIndex((h) => (h === "/" ? path === "/" : path.startsWith(h)));
  return i < 0 ? 0 : i;
};

/** Última sección mostrada (vive mientras la app está abierta). */
const shown = { index: -1 };

/**
 * Entrada de cada sección al navegar: la pantalla anterior se va al instante y la nueva
 * entra deslizándose desde el lado que corresponde. Nunca hay dos pantallas encimadas
 * (a diferencia de las View Transitions, que en la app instalada se superponían).
 * Corre en un layout effect, así también anima cuando Next vuelve a mostrar una sección guardada.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const el = ref.current;
    const index = indexOf(pathname);
    const prev = shown.index;
    shown.index = index;
    if (!el || prev < 0 || prev === index) return; // primera carga: de eso se ocupa la entrada de las tarjetas
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dx = index > prev ? 28 : -28;
    const anim = el.animate(
      [{ opacity: 0, transform: `translate3d(${dx}px,0,0)` }, { opacity: 1, transform: "translate3d(0,0,0)" }],
      { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
    return () => anim.cancel();
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
