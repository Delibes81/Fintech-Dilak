import { CATEGORY_ICONS } from "./icons";
import type { Category } from "@/lib/types";

/** Ícono de categoría en baldosa con su color. El nombre siempre acompaña: el color nunca va solo. */
export function CategoryIcon({ category, size = 40, className = "" }: { category?: Pick<Category, "icon" | "color"> | null; size?: number; className?: string }) {
  const Icon = CATEGORY_ICONS[category?.icon ?? "dots"] ?? CATEGORY_ICONS.dots;
  const color = `var(--cat-${category?.color ?? "slate"})`;
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center ${className}`}
      style={{
        width: size, height: size, borderRadius: size * 0.32, color,
        background: `linear-gradient(160deg, color-mix(in srgb, ${color} 22%, var(--surface)), color-mix(in srgb, ${color} 8%, var(--surface)))`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 22%, transparent)`,
      }}>
      <Icon size={Math.round(size * 0.48)} strokeWidth={2} />
    </span>
  );
}
