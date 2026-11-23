import { useId } from "react";
import { cn } from "@/lib/cn";

/** Isotipo de Fintech Dilak: una "D" geométrica con barras de crecimiento dentro. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#15183a" /><stop offset="1" stopColor="#090a16" /></linearGradient>
        <linearGradient id={`fg${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9b8cff" /><stop offset="1" stopColor="#38d6ff" /></linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#bg${id})`} />
      <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" fill="none" stroke="rgb(255 255 255 / .12)" />
      <path d="M18 14h13c11 0 19 7.6 19 18s-8 18-19 18H18z" fill="none" stroke={`url(#fg${id})`} strokeWidth="5.5" strokeLinejoin="round" />
      <rect x="25" y="34" width="5" height="9" rx="1.5" fill={`url(#fg${id})`} />
      <rect x="32.5" y="28" width="5" height="15" rx="1.5" fill={`url(#fg${id})`} />
      <rect x="40" y="22" width="5" height="21" rx="1.5" fill={`url(#fg${id})`} opacity=".55" />
    </svg>
  );
}

export function Wordmark({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className={cn("font-mono uppercase tracking-[0.2em] text-ink-3", size === "lg" ? "text-[11px]" : "text-[9px]")}>Fintech</span>
      <span className={cn("font-semibold tracking-[-0.04em] text-ink", size === "lg" ? "text-[30px]" : "text-[18px]")}>Dilak</span>
    </span>
  );
}
