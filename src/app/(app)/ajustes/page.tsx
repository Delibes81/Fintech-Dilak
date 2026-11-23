"use client";

import { useState } from "react";
import { Copy, LogOut, Monitor, Moon, Plus, RefreshCw, Share2, Sun } from "lucide-react";
import { toast } from "sonner";
import { useHousehold } from "@/store/household";
import { Section } from "@/components/ui/Section";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CATEGORY_COLORS } from "@/components/ui/icons";
import { CategorySheet, type CategoryDraft } from "@/components/plan/CategorySheet";
import { InstallCard } from "@/components/pwa/InstallCard";
import { CURRENCIES } from "@/lib/money";
import type { Category } from "@/lib/types";

type Theme = "system" | "light" | "dark";

export default function Ajustes() {
  const hh = useHousehold();
  const [name, setName] = useState(hh.me?.display_name ?? "");
  const [hhName, setHhName] = useState(hh.household.name);
  const [pct, setPct] = useState(hh.household.savings_target_pct);
  // Esta pantalla solo se dibuja en el navegador (la libreta carga del lado del cliente)
  const [theme, setTheme] = useState<Theme>(() => {
    try { const t = localStorage.getItem("theme"); if (t === "light" || t === "dark") return t; } catch { /* sin storage */ }
    return "system";
  });
  const [catDraft, setCatDraft] = useState<CategoryDraft | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  function applyTheme(t: Theme) {
    setTheme(t);
    try { if (t === "system") localStorage.removeItem("theme"); else localStorage.setItem("theme", t); } catch { /* sin storage */ }
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }

  const inviteText = `Sumate a nuestra libreta de finanzas "${hh.household.name}". Entrá a ${typeof window !== "undefined" ? window.location.origin : ""} y usá el código ${hh.household.invite_code}`;
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: "La Libreta de Casa", text: inviteText }); return; } catch { return; } }
    copy();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(hh.household.invite_code); toast.success("Código copiado"); }
    catch { toast("Código: " + hh.household.invite_code); }
  }

  const [catKey, setCatKey] = useState(0);
  const editCat = (c: CategoryDraft) => { setCatDraft(c); setCatKey((k) => k + 1); setCatOpen(true); };
  const cats = hh.categories.filter((c) => showArchived || !c.archived);
  const group = (k: "expense" | "income") => cats.filter((c) => c.kind === k);

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="font-display text-[26px] font-extrabold tracking-tight">Ajustes</h1>

      <Section title="Tu perfil">
        <div className="flex items-center gap-3">
          <Avatar member={{ display_name: name || "?", color: hh.me?.color ?? "blue" }} size={52} />
          <div className="min-w-0 flex-1">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== hh.me?.display_name && hh.updateMe({ display_name: name.trim() })}
              placeholder="Tu nombre" maxLength={40} aria-label="Tu nombre" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Tu color">
          {CATEGORY_COLORS.filter((c) => c !== "slate").map((c) => (
            <button key={c} type="button" role="radio" aria-checked={hh.me?.color === c} aria-label={c} onClick={() => hh.updateMe({ color: c })}
              className={`size-8 rounded-full ring-offset-2 ring-offset-[var(--surface)] ${hh.me?.color === c ? "ring-2 ring-ink" : ""}`} style={{ background: `var(--cat-${c})` }} />
          ))}
        </div>
        <p className="mt-3 text-[13px] text-ink-3">{hh.email}</p>
      </Section>

      <Section title="Invitar a tu pareja">
        <p className="mb-3 text-[14px] text-ink-2">Que entre a la app con su email y elija <b className="text-ink">“Tengo un código”</b>. Van a ver y cargar lo mismo, en tiempo real.</p>
        <div className="flex items-center gap-2">
          <div className="num flex h-14 flex-1 items-center justify-center rounded-2xl bg-surface-2 font-display text-[28px] font-extrabold tracking-[0.3em]">{hh.household.invite_code}</div>
          <button type="button" className="btn h-14 w-14 px-0" onClick={copy} aria-label="Copiar código"><Copy size={20} /></button>
          <button type="button" className="btn btn-primary h-14 px-4" onClick={share}><Share2 size={18} /> Enviar</button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {hh.members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3">
              <Avatar member={m} size={32} />
              <span className="font-semibold">{m.display_name || "Sin nombre"}</span>
              {m.user_id === hh.userId && <span className="pill">Vos</span>}
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-sm btn-ghost mt-3 px-1" onClick={async () => { await hh.regenerateCode(); toast.success("Código nuevo generado. El anterior ya no sirve."); }}>
          <RefreshCw size={15} /> Generar un código nuevo
        </button>
      </Section>

      <Section title="Hogar">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5"><span className="label">Nombre de la libreta</span>
            <input className="field" value={hhName} onChange={(e) => setHhName(e.target.value)} onBlur={() => hhName.trim() && hhName !== hh.household.name && hh.updateHousehold({ name: hhName.trim() })} maxLength={40} />
          </label>
          <label className="flex flex-col gap-1.5"><span className="label">Moneda</span>
            <select className="field" value={hh.household.currency} onChange={(e) => hh.updateHousehold({ currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between"><span className="label">Meta de ahorro mensual</span><span className="num font-display text-[18px] font-bold">{pct}%</span></div>
            <input type="range" min={5} max={50} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))}
              onPointerUp={() => pct !== hh.household.savings_target_pct && hh.updateHousehold({ savings_target_pct: pct })}
              onKeyUp={() => pct !== hh.household.savings_target_pct && hh.updateHousehold({ savings_target_pct: pct })}
              className="w-full accent-[var(--accent)]" aria-label="Meta de ahorro mensual" />
            <p className="text-[13px] text-ink-2">El 20% es la referencia clásica. Si recién empiezan, 10% ya es un gran paso. Se usa para calcular el “disponible para gastar”.</p>
          </div>
        </div>
      </Section>

      <Section title="Categorías" aside={<button type="button" className="btn btn-sm btn-soft" onClick={() => editCat({ kind: "expense", bucket: "want", icon: "tag", color: "blue" })}><Plus size={16} /> Nueva</button>}>
        {(["expense", "income"] as const).map((k) => (
          <div key={k} className="mb-3 last:mb-0">
            <p className="eyebrow mb-1.5">{k === "expense" ? "Gastos" : "Ingresos"}</p>
            <div className="flex flex-wrap gap-2">
              {group(k).map((c: Category) => (
                <button key={c.id} type="button" className={`chip h-10 pl-1.5 ${c.archived ? "opacity-50" : ""}`} onClick={() => editCat(c)}>
                  <CategoryIcon category={c} size={26} /> {c.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {hh.categories.some((c) => c.archived) && (
          <button type="button" className="btn btn-sm btn-ghost mt-1 px-1" onClick={() => setShowArchived((s) => !s)}>{showArchived ? "Ocultar archivadas" : "Ver archivadas"}</button>
        )}
      </Section>

      <Section title="Apariencia">
        <div className="seg w-full [&>button]:flex-1" role="radiogroup" aria-label="Tema">
          {([["system", "Sistema", Monitor], ["light", "Claro", Sun], ["dark", "Oscuro", Moon]] as const).map(([t, label, Icon]) => (
            <button key={t} type="button" role="radio" aria-checked={theme === t} data-on={theme === t} onClick={() => applyTheme(t)} className="flex items-center justify-center gap-1.5">
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Instalar en el teléfono">
        <InstallCard />
      </Section>

      <button type="button" className="btn btn-danger w-full" onClick={hh.signOut}><LogOut size={18} /> Cerrar sesión</button>
      <p className="pb-4 text-center text-[12px] text-ink-3">La Libreta de Casa · sus datos viven en su propio proyecto de Supabase</p>

      <CategorySheet key={catKey} open={catOpen} onOpenChange={setCatOpen} draft={catDraft} />
    </div>
  );
}
