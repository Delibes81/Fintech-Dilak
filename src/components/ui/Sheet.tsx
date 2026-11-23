"use client";
import { Drawer } from "vaul";
import type { ReactNode } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Oculta el título visualmente (sigue disponible para lectores de pantalla). */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerRight?: ReactNode;
}

/** Hoja que sube desde abajo en el celular; panel centrado en pantallas grandes. */
export function Sheet({ open, onOpenChange, title, hideTitle, description, children, footer, headerRight }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[calc(100dvh-20px)] w-full max-w-[520px] flex-col rounded-t-[28px] border border-b-0 border-line bg-surface shadow-pop outline-none md:bottom-4 md:rounded-[28px] md:border-b"
          aria-describedby={description ? undefined : undefined}
        >
          <div className="mx-auto mt-2.5 mb-1 h-1 w-10 shrink-0 rounded-full bg-surface-3" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" aria-hidden="true" />
          <div className={`flex items-center gap-3 px-5 pt-2 ${hideTitle ? "sr-only" : "pb-1"}`}>
            <Drawer.Title className="text-[18px] font-semibold tracking-tight">{title}</Drawer.Title>
            <div className="ml-auto flex items-center gap-2">{headerRight}</div>
          </div>
          {description ? (
            <Drawer.Description className="px-5 text-[14px] text-ink-2">{description}</Drawer.Description>
          ) : (
            <Drawer.Description className="sr-only">{title}</Drawer.Description>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-4">{children}</div>
          {footer && (
            <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">{footer}</div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
