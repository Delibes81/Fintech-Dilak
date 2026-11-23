import type { ReactNode } from "react";

export function Empty({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-7 text-center">
      {icon && (
        <div className="mb-1 grid size-12 place-items-center rounded-2xl border border-line bg-surface-2 text-accent shadow-[0_0_24px_-8px_var(--accent)]">{icon}</div>
      )}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="max-w-[36ch] text-[13.5px] text-ink-2">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
