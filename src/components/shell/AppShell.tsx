"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChartNoAxesColumn, ChevronLeft, ChevronRight, House, ListFilter, Plus, Target } from "lucide-react";
import { useHousehold } from "@/store/household";
import { UiContext, type UiCtx } from "@/store/ui";
import { TxSheet, type TxSheetMode } from "@/components/tx/TxSheet";
import { Avatar } from "@/components/ui/Avatar";
import { addMonths, currentYM, monthLabel, monthName } from "@/lib/dates";

const NAV = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/movimientos", label: "Movimientos", icon: ListFilter },
  { href: "/plan", label: "Plan", icon: Target },
  { href: "/analisis", label: "Análisis", icon: ChartNoAxesColumn },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { ym, setYm, me, household } = useHousehold();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<TxSheetMode>({ type: "new" });
  const [sheetKey, setSheetKey] = useState(0);

  const ui = useMemo<UiCtx>(() => ({
    openNewTx: (prefill) => { setMode({ type: "new", prefill }); setSheetKey((k) => k + 1); setSheetOpen(true); },
    openEditTx: (tx) => { setMode({ type: "edit", tx }); setSheetKey((k) => k + 1); setSheetOpen(true); },
  }), []);

  // Atajo del ícono instalado: /?nuevo=1 abre la carga directo
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("nuevo") === "1") {
      ui.openNewTx();
      url.searchParams.delete("nuevo");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [ui]);

  // Tecla "n" en la compu: nuevo movimiento
  const onKey = useCallback((e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (sheetOpen || e.metaKey || e.ctrlKey || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return;
    if (e.key === "n" || e.key === "N") { e.preventDefault(); ui.openNewTx(); }
  }, [sheetOpen, ui]);
  useEffect(() => { window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onKey]);

  const isCurrent = ym === currentYM();
  const showMonth = pathname !== "/ajustes";

  return (
    <UiContext value={ui}>
      {/* Banda del área segura superior */}
      <div className="fixed inset-x-0 top-0 z-30 h-[env(safe-area-inset-top)] bg-bg" aria-hidden="true" />

      <header className="sticky top-[env(safe-area-inset-top)] z-20 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[760px] items-center gap-3 pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))]">
          <Link href="/" className="mr-auto flex min-w-0 items-center gap-2.5">
            <img src="/icons/icon-192.png" alt="" width={32} height={32} className="size-8 rounded-[10px]" />
            <span className="truncate font-display text-[17px] font-bold tracking-tight max-[440px]:hidden">{household.name}</span>
          </Link>

          {showMonth && (
            <div className="flex items-center rounded-full border border-line bg-surface p-0.5 shadow-sm">
              <button type="button" onClick={() => setYm(addMonths(ym, -1))} className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Mes anterior">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => setYm(currentYM())} title="Ir al mes actual"
                className={`px-1 text-center text-[14px] font-bold whitespace-nowrap capitalize ${isCurrent ? "" : "text-accent"}`}>
                <span className="sm:hidden">{monthName(ym).slice(0, 3)} {ym.slice(0, 4)}</span>
                <span className="hidden sm:inline">{monthLabel(ym)}</span>
              </button>
              <button type="button" onClick={() => setYm(addMonths(ym, 1))} className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Mes siguiente">
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          <Link href="/ajustes" aria-label="Ajustes y perfil" className="rounded-full ring-offset-2 ring-offset-bg hover:ring-2 hover:ring-line">
            <Avatar member={me} size={38} />
          </Link>
        </div>

        {/* Navegación de escritorio */}
        <nav className="mx-auto hidden max-w-[760px] gap-1 px-4 pb-2 md:flex" aria-label="Secciones">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined}
                className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-[14.5px] font-semibold transition-colors ${on ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2"}`}>
                <Icon size={18} /> {label}
              </Link>
            );
          })}
          <button type="button" onClick={() => ui.openNewTx()} className="btn btn-primary ml-auto h-10" title="Atajo: tecla N">
            <Plus size={18} /> Cargar
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-[760px] pr-[max(16px,env(safe-area-inset-right))] pb-[calc(env(safe-area-inset-bottom)+112px)] pl-[max(16px,env(safe-area-inset-left))] md:pb-16">
        {children}
      </main>

      {/* Navegación del celular, con el botón de cargar al centro */}
      <nav aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 pr-[max(8px,env(safe-area-inset-right))] pb-[max(8px,env(safe-area-inset-bottom))] pl-[max(8px,env(safe-area-inset-left))] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-[520px] grid-cols-5 items-end pt-1.5">
          {NAV.slice(0, 2).map((n) => <NavItem key={n.href} {...n} pathname={pathname} />)}
          <div className="flex justify-center">
            <button type="button" onClick={() => ui.openNewTx()} aria-label="Cargar gasto o ingreso"
              className="-mt-7 grid size-[60px] place-items-center rounded-[22px] bg-accent text-accent-ink shadow-[0_10px_24px_-6px_color-mix(in_srgb,var(--accent)_70%,transparent)] transition-transform active:scale-90">
              <Plus size={30} strokeWidth={2.4} />
            </button>
          </div>
          {NAV.slice(2).map((n) => <NavItem key={n.href} {...n} pathname={pathname} />)}
        </div>
      </nav>

      <TxSheet key={sheetKey} open={sheetOpen} onOpenChange={setSheetOpen} mode={mode} />
    </UiContext>
  );
}

function NavItem({ href, label, icon: Icon, pathname }: (typeof NAV)[number] & { pathname: string }) {
  const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link href={href} aria-current={on ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition-colors ${on ? "text-accent" : "text-ink-3"}`}>
      <Icon size={22} strokeWidth={on ? 2.4 : 2} />
      {label}
    </Link>
  );
}
