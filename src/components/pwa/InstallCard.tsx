"use client";
import { useEffect, useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Botón "Instalar app" (Android/Chrome/Edge) o instrucciones para iPhone. */
export function InstallCard() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  // Se dibuja solo en el navegador (dentro de la libreta), así que puede leer window al iniciar.
  const [standalone] = useState(() => typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true));
  const [ios] = useState(() => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent));

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone) return <p className="text-[14px] text-ink-2">Ya la están usando como app instalada.</p>;
  if (evt)
    return (
      <button type="button" className="btn btn-primary w-full" onClick={async () => { await evt.prompt(); setEvt(null); }}>
        <Download size={18} /> Instalar La Libreta
      </button>
    );
  if (ios)
    return (
      <ol className="flex flex-col gap-2 text-[14px] text-ink-2">
        <li className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-surface-2"><Share size={15} /></span>Abrila en Safari y tocá <b className="text-ink">Compartir</b>.</li>
        <li className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-surface-2"><SquarePlus size={15} /></span>Elegí <b className="text-ink">Agregar a inicio</b>.</li>
      </ol>
    );
  return <p className="text-[14px] text-ink-2">En Chrome o Edge, usá el ícono de instalar de la barra de direcciones o el menú → “Instalar app”.</p>;
}
