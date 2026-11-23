"use client";
import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";

/** Número que cuenta hasta su valor y se desliza cuando cambia (saldo, totales). */
export function NumberTicker({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const reduce = useReducedMotion();
  const spring = useSpring(reduce ? value : 0, { stiffness: 70, damping: 20, mass: 0.8 });
  const text = useTransform(spring, (v) => format(v));
  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);
  return <motion.span className={className}>{text}</motion.span>;
}
