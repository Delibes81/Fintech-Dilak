import type { ReactNode } from "react";

export function Empty({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      {icon && <div className="mb-1 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="max-w-[34ch] text-[14px] text-ink-2">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
