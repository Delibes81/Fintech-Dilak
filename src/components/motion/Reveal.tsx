"use client";
import { useEffect, useState } from "react";
import { motion, type HTMLMotionProps } from "motion/react";

const EASE = [0.2, 0.8, 0.2, 1] as const;

/** ¿Ya se mostró la entrada de las tarjetas en esta sesión? Solo se hace al abrir la app. */
const revealed = { done: false };

/**
 * Contenedor que escalona la entrada de sus hijos <RevealItem>.
 * Solo al abrir la app: al cambiar de sección entra la pantalla entera (PageTransition)
 * y repetir la cascada de tarjetas encima se sentía lento y encimado.
 */
export function Reveal({ children, className, delay = 0, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  const [initial] = useState(() => (revealed.done ? false : "hidden"));
  useEffect(() => { revealed.done = true; }, []);
  return (
    <motion.div
      className={className}
      initial={initial}
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Entra desde abajo (sin desenfoque: en el celular el filtro traba los frames). */
export function RevealItem({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0.001, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
