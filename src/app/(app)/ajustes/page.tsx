"use client";

import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal, RevealItem } from "@/components/motion/Reveal";
import { Segmented } from "@/components/ui/Segmented";
import { useState } from "react";
import { LogOut, Monitor, Moon, Plus, Sun } from "lucide-react";
import { ChangePassword } from "@/components/account/ChangePassword";
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
  // Esta pantalla solo se dibuja en el navegador (los datos cargan del lado del cliente)
  const [theme, setTheme] = useState<Theme>(() => {
    try { const t = localStorage.getItem("theme"); if (t === "light" || t === "system") return t; } catch { /* sin storage */ }
    return "dark"; // oscuro por defecto
  });
  const [catDraft, setCatDraft] = useState<CategoryDraft | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  function applyTheme(t: Theme) {
    setTheme(t);
    try { localStorage.setItem("theme", t); } catch { /* sin storage */ }
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }

  const [catKey, setCatKey] = useState(0);
  const editCat = (c: CategoryDraft) => { setCatDraft(c); setCatKey((k) => k + 1); setCatOpen(true); };
  const cats = hh.categories.filter((c) => showArchived || !c.archived);
  const group = (k: "expense" | "income") => cats.filter((c) => c.kind === k);

  return (
    <PageTransition>
    <Reveal className="flex flex-col gap-4 pt-2 md:gap-5">
      <RevealItem>
        <p className="eyebrow">Cuenta</p>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold md:text-[32px]">Ajustes</h1>
      </RevealItem>
      <RevealItem className="flex flex-col gap-4 md:gap-5">

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
      </Section>

      <Section eyebrow="Acceso" title="Seguridad">
        <p className="mb-3 text-[13.5px] text-ink-2">Fintech Dilak es privado: solo estas dos cuentas pueden entrar y ven lo mismo en tiempo real.</p>
        <div className="mb-4 flex flex-col gap-2">
          {hh.members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-3 py-2">
              <Avatar member={m} size={30} />
              <span className="font-medium">{m.display_name || "Sin nombre"}</span>
              {m.user_id === hh.userId && <span className="pill pill-accent ml-auto">Vos</span>}
            </div>
          ))}
        </div>
        <ChangePassword />
      </Section>

      <Section title="Hogar">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5"><span className="label">Nombre del hogar</span>
            <input className="field" value={hhName} onChange={(e) => setHhName(e.target.value)} onBlur={() => hhName.trim() && hhName !== hh.household.name && hh.updateHousehold({ name: hhName.trim() })} maxLength={40} />
          </label>
          <label className="flex flex-col gap-1.5"><span className="label">Moneda</span>
            <select className="field" value={hh.household.currency} onChange={(e) => hh.updateHousehold({ currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between"><span className="label">Meta de ahorro mensual</span><span className="num text-[18px] font-bold">{pct}%</span></div>
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
        <Segmented full label="Tema" value={theme} onChange={applyTheme} options={[
          { value: "dark", label: <><Moon size={15} /> Oscuro</> },
          { value: "light", label: <><Sun size={15} /> Claro</> },
          { value: "system", label: <><Monitor size={15} /> Sistema</> },
        ]} />
      </Section>

      <Section title="Instalar en el teléfono">
        <InstallCard />
      </Section>

      <button type="button" className="btn btn-danger w-full" onClick={hh.signOut}><LogOut size={18} /> Cerrar sesión</button>
      <p className="pb-4 text-center text-[12px] text-ink-3">Fintech Dilak · sus datos viven en su propio proyecto de Supabase</p>

      <CategorySheet key={catKey} open={catOpen} onOpenChange={setCatOpen} draft={catDraft} />
      </RevealItem>
    </Reveal>
    </PageTransition>
  );
}
