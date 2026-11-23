import { CATEGORY_ICONS } from "./icons";
import type { Category } from "@/lib/types";

/** Ícono de categoría en una baldosa con su color. El nombre siempre acompaña: el color nunca va solo. */
export function CategoryIcon({ category, size = 40, className = "" }: { category?: Pick<Category, "icon" | "color"> | null; size?: number; className?: string }) {
  const Icon = CATEGORY_ICONS[category?.icon ?? "dots"] ?? CATEGORY_ICONS.dots;
  const color = `var(--cat-${category?.color ?? "slate"})`;
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center ${className}`}
      style={{
        width: size, height: size, borderRadius: size * 0.34, color,
        background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.1} />
    </span>
  );
}
