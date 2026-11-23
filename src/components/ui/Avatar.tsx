import type { Member } from "@/lib/types";

export function Avatar({ member, size = 22, title }: { member?: Pick<Member, "display_name" | "color"> | null; size?: number; title?: string }) {
  const name = member?.display_name?.trim() || "?";
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const color = `var(--cat-${member?.color ?? "slate"})`;
  return (
    <span title={title ?? name} aria-hidden="true" className="inline-grid shrink-0 place-items-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: size * 0.42, color, background: `color-mix(in srgb, ${color} 18%, var(--surface))` }}>
      {initials}
    </span>
  );
}
