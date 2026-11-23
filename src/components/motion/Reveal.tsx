"use client";
import { motion, type HTMLMotionProps } from "motion/react";

const EASE = [0.2, 0.8, 0.2, 1] as const;

/** Contenedor que escalona la entrada de sus hijos <RevealItem>. */
export function Reveal({ children, className, delay = 0, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Entra desde abajo con un leve desenfoque. Arranca visible si el usuario prefiere menos movimiento. */
export function RevealItem({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0.001, y: 14, filter: "blur(6px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
