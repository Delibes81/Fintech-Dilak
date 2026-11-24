"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { ChartNoAxesCombined, ChevronLeft, ChevronRight, House, ListFilter, Mic, Plus, Settings, Target } from "lucide-react";
import { VoiceSheet } from "@/components/voice/VoiceSheet";
import { useHousehold } from "@/store/household";
import { UiContext, type UiCtx } from "@/store/ui";
import { TxSheet, type TxSheetMode } from "@/components/tx/TxSheet";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { addMonths, currentYM, monthLabel, monthName } from "@/lib/dates";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/movimientos", label: "Movimientos", icon: ListFilter },
  { href: "/plan", label: "Plan", icon: Target },
  { href: "/analisis", label: "Análisis", icon: ChartNoAxesCombined },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];
const indexOf = (path: string) => {
  const i = NAV.findIndex((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)));
  return i < 0 ? 0 : i;
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { ym, setYm, me, household, memberName, userId } = useHousehold();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<TxSheetMode>({ type: "new" });
  const [sheetKey, setSheetKey] = useState(0);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceKey, setVoiceKey] = useState(0);
  const current = indexOf(pathname);

  const ui = useMemo<UiCtx>(() => ({
    openNewTx: (prefill) => { setMode({ type: "new", prefill }); setSheetKey((k) => k + 1); setSheetOpen(true); },
    openEditTx: (tx) => { setMode({ type: "edit", tx }); setSheetKey((k) => k + 1); setSheetOpen(true); },
    openVoice: () => { setVoiceKey((k) => k + 1); setVoiceOpen(true); },
  }), []);

  // Atajos del ícono instalado: /?nuevo=1 abre la carga y /?voz=1 el dictado
  useEffect(() => {
    const url = new URL(window.location.href);
    const nuevo = url.searchParams.get("nuevo") === "1", voz = url.searchParams.get("voz") === "1";
    if (!nuevo && !voz) return;
    if (voz) ui.openVoice(); else ui.openNewTx();
    url.searchParams.delete("nuevo"); url.searchParams.delete("voz");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [ui]);

  // Teclas en la compu: "N" nuevo movimiento, "V" dictar
  const onKey = useCallback((e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (sheetOpen || voiceOpen || e.metaKey || e.ctrlKey || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return;
    if (e.key === "n" || e.key === "N") { e.preventDefault(); ui.openNewTx(); }
    if (e.key === "v" || e.key === "V") { e.preventDefault(); ui.openVoice(); }
  }, [sheetOpen, voiceOpen, ui]);

  // Mantener apretado el botón + abre el dictado
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const pressStart = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => { longPressed.current = true; try { navigator.vibrate?.(18); } catch { /* sin vibración */ } ui.openVoice(); }, 450);
  };
  const pressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  useEffect(() => { window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onKey]);

  const isCurrent = ym === currentYM();
  const monthSwitcher = (
    <div className="flex items-center rounded-full border border-line bg-surface/80 p-0.5 backdrop-blur">
      <button type="button" onClick={() => setYm(addMonths(ym, -1))} className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label="Mes anterior">
        <ChevronLeft size={17} />
      </button>
      <button type="button" onClick={() => setYm(currentYM())} title="Ir al mes actual"
        className={cn("num px-1.5 text-[13px] font-medium whitespace-nowrap capitalize", isCurrent ? "text-ink" : "text-accent")}>
        <span className="sm:hidden">{monthName(ym).slice(0, 3)} {ym.slice(2, 4)}</span>
        <span className="hidden sm:inline">{monthLabel(ym)}</span>
      </button>
      <button type="button" onClick={() => setYm(addMonths(ym, 1))} className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label="Mes siguiente">
        <ChevronRight size={17} />
      </button>
    </div>
  );

  return (
    <UiContext value={ui}>
      <div className="fixed inset-x-0 top-0 z-30 h-[env(safe-area-inset-top)] bg-bg" aria-hidden="true" />

      {/* Barra lateral (compu) */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col border-r border-line bg-surface/55 px-3 pt-5 pb-4 backdrop-blur-xl md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2">
          <LogoMark size={34} />
          <Wordmark />
        </Link>
        <button type="button" onClick={() => ui.openNewTx()} className="btn btn-primary mb-2 w-full justify-between">
          <span className="flex items-center gap-2"><Plus size={18} /> Nuevo movimiento</span>
          <kbd className="num rounded-md border border-white/25 px-1.5 text-[11px] font-medium text-white/80">N</kbd>
        </button>
        <button type="button" onClick={() => ui.openVoice()} className="btn mb-5 w-full justify-between">
          <span className="flex items-center gap-2"><Mic size={17} className="text-accent" /> Dictar</span>
          <kbd className="num rounded-md border border-line px-1.5 text-[11px] font-medium text-ink-3">V</kbd>
        </button>
        <p className="eyebrow mb-2 px-3">Navegación</p>
        <nav className="flex flex-col gap-0.5" aria-label="Secciones">
          {NAV.map((n, i) => {
            const on = i === current;
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
                className={cn("relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors", on ? "text-ink" : "text-ink-2 hover:text-ink")}>
                {on && <motion.span layoutId="side-active" className="absolute inset-0 -z-10 rounded-xl border border-line bg-surface-2" />}
                {on && <motion.span layoutId="side-bar" className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full bg-gradient-to-b from-accent to-accent-2" />}
                <Icon size={18} className={on ? "text-accent" : ""} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-line bg-surface-2/60 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar member={me} size={34} />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold">{memberName(userId)}</p>
              <p className="truncate text-[12px] text-ink-3">{household.name}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="md:pl-[244px]">
        {/* Encabezado */}
        <header className="sticky top-[env(safe-area-inset-top)] z-20 bg-bg/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))] md:px-8">
            <Link href="/" className="mr-auto flex items-center gap-2 md:hidden" aria-label="Inicio">
              <LogoMark size={32} />
              <span className="text-[17px] font-semibold tracking-[-0.04em] max-[360px]:hidden">Dilak</span>
            </Link>
            <p className="mr-auto hidden truncate text-[13px] text-ink-3 md:block">
              <span className="num">{household.name}</span>
            </p>
            {pathname !== "/ajustes" && monthSwitcher}
            <Link href="/ajustes" aria-label="Ajustes y perfil" className="rounded-full ring-offset-2 ring-offset-bg transition hover:ring-2 hover:ring-accent/50 md:hidden">
              <Avatar member={me} size={34} />
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-[1120px] pr-[max(16px,env(safe-area-inset-right))] pb-[calc(env(safe-area-inset-bottom)+120px)] pl-[max(16px,env(safe-area-inset-left))] md:px-8 md:pb-16">
          {children}
        </main>
      </div>

      {/* Dock flotante (celular) */}
      <nav aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 px-[max(12px,env(safe-area-inset-left))] pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto grid max-w-[460px] grid-cols-5 items-center rounded-[24px] border border-line bg-surface/80 p-1.5 shadow-pop backdrop-blur-2xl">
          {NAV.slice(0, 2).map((n, i) => <DockItem key={n.href} {...n} on={i === current} />)}
          <div className="flex justify-center">
            <motion.button type="button" aria-label="Nuevo movimiento (mantené apretado para dictar)" whileTap={{ scale: 0.88 }}
              onClick={() => { if (!longPressed.current) ui.openNewTx(); }}
              onPointerDown={pressStart} onPointerUp={pressEnd} onPointerLeave={pressEnd} onPointerCancel={pressEnd}
              onContextMenu={(e) => e.preventDefault()}
              className="glow-pulse grid size-[52px] place-items-center rounded-[18px] bg-gradient-accent text-white">
              <motion.span animate={{ rotate: sheetOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                <Plus size={26} strokeWidth={2.4} />
              </motion.span>
            </motion.button>
          </div>
          {NAV.slice(2, 4).map((n, j) => { const i = j + 2; return <DockItem key={n.href} {...n} on={i === current} />; })}
        </div>
      </nav>

      <TxSheet key={sheetKey} open={sheetOpen} onOpenChange={setSheetOpen} mode={mode} />
      <VoiceSheet key={`v${voiceKey}`} open={voiceOpen} onOpenChange={setVoiceOpen} onManual={(prefill) => ui.openNewTx(prefill)} />
    </UiContext>
  );
}

function DockItem({ href, label, icon: Icon, on }: (typeof NAV)[number] & { on: boolean }) {
  return (
    <Link href={href} aria-current={on ? "page" : undefined}
      className={cn("relative flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-[18px] text-[10.5px] font-medium transition-colors", on ? "text-ink" : "text-ink-3")}>
      {on && <motion.span layoutId="dock-active" className="absolute inset-0 -z-10 rounded-[18px] bg-surface-3/80" transition={{ type: "spring", stiffness: 450, damping: 36 }} />}
      <Icon size={20} strokeWidth={on ? 2.3 : 1.9} className={on ? "text-accent" : ""} />
      {label}
    </Link>
  );
}
