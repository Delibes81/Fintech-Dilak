"use client";

import { useMemo, useState } from "react";
import { Download, ReceiptText, Search, X } from "lucide-react";
import { useHousehold } from "@/store/household";
import { useUi } from "@/store/ui";
import { TxGrouped } from "@/components/tx/TxList";
import { Empty } from "@/components/ui/Empty";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { normalize } from "@/lib/smart";
import { monthLabel, monthName } from "@/lib/dates";
import { formatCompact } from "@/lib/money";

type KindFilter = "all" | "expense" | "income";

export default function Movimientos() {
  const hh = useHousehold();
  const { openNewTx } = useUi();
  const [kind, setKind] = useState<KindFilter>("all");
  const [cat, setCat] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const txs = hh.months[hh.ym];

  const usedCats = useMemo(() => {
    const ids = new Set((txs ?? []).map((t) => t.category_id));
    return hh.categories.filter((c) => ids.has(c.id));
  }, [txs, hh.categories]);

  const list = useMemo(() => {
    const nq = normalize(q);
    return (txs ?? []).filter((t) => {
      if (kind !== "all" && t.kind !== kind) return false;
      if (cat && t.category_id !== cat) return false;
      if (who && t.created_by !== who) return false;
      if (nq) {
        const c = hh.categories.find((x) => x.id === t.category_id);
        if (!normalize(`${t.note} ${c?.name ?? ""} ${t.amount}`).includes(nq)) return false;
      }
      return true;
    });
  }, [txs, kind, cat, who, q, hh.categories]);

  const inc = list.filter((t) => t.kind === "income").reduce((a, t) => a + t.amount, 0);
  const out = list.filter((t) => t.kind === "expense").reduce((a, t) => a + t.amount, 0);
  const filtered = kind !== "all" || cat || who || q;

  function exportCsv() {
    const rows = [["fecha", "tipo", "monto", "categoria", "detalle", "cargado_por", "fijo"]];
    for (const t of [...list].reverse()) {
      rows.push([
        t.occurred_on, t.kind === "income" ? "ingreso" : "gasto", String(t.amount),
        hh.categories.find((c) => c.id === t.category_id)?.name ?? "", t.note, hh.memberName(t.created_by), t.recurring_id ? "si" : "",
      ]);
    }
    const csv = rows.map((r) => r.map((v) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `libreta-${hh.ym}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight">Movimientos</h1>
          <p className="text-[14px] text-ink-2 first-letter:uppercase">{monthLabel(hh.ym)} · {list.length} {list.length === 1 ? "movimiento" : "movimientos"}</p>
        </div>
        {list.length > 0 && (
          <button type="button" className="btn btn-sm" onClick={exportCsv} title="Descargar para Excel o Google Sheets">
            <Download size={16} /> CSV
          </button>
        )}
      </div>

      {/* Totales del filtro */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Ingresos" value={hh.fmt(inc)} short={formatCompact(inc, hh.household.currency)} tone="pos" />
        <Stat label="Gastos" value={hh.fmt(out)} short={formatCompact(out, hh.household.currency)} tone="neg" />
        <Stat label="Neto" value={hh.fmt(inc - out, { sign: inc - out !== 0 })} short={(inc - out > 0 ? "+" : "") + formatCompact(inc - out, hh.household.currency)} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por detalle, categoría o monto" className="field pl-10" type="search" aria-label="Buscar" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <div className="seg shrink-0">
            {(["all", "expense", "income"] as const).map((k) => (
              <button key={k} type="button" data-on={kind === k} onClick={() => setKind(k)}>{k === "all" ? "Todo" : k === "expense" ? "Gastos" : "Ingresos"}</button>
            ))}
          </div>
          {hh.members.length > 1 && hh.members.map((m) => (
            <button key={m.user_id} type="button" className="chip h-10 shrink-0" data-on={who === m.user_id} onClick={() => setWho(who === m.user_id ? null : m.user_id)}>
              {hh.memberName(m.user_id)}
            </button>
          ))}
          {usedCats.map((c) => (
            <button key={c.id} type="button" className="chip h-10 shrink-0 pl-1.5" data-on={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
              <CategoryIcon category={c} size={26} /> {c.name}
            </button>
          ))}
        </div>
        {filtered && (
          <button type="button" className="btn btn-sm btn-ghost self-start px-1" onClick={() => { setKind("all"); setCat(null); setWho(null); setQ(""); }}>
            <X size={15} /> Limpiar filtros
          </button>
        )}
      </div>

      {!txs ? (
        <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : list.length === 0 ? (
        <div className="card">
          <Empty title={filtered ? "Nada coincide con el filtro" : `Sin movimientos en ${monthName(hh.ym)}`} icon={<ReceiptText size={22} />}
            action={!filtered ? <button type="button" className="btn btn-primary" onClick={() => openNewTx()}>Cargar movimiento</button> : undefined}>
            {filtered ? "Probá con otra palabra o limpiá los filtros." : "Lo que carguen aparece acá, agrupado por día."}
          </Empty>
        </div>
      ) : (
        <TxGrouped txs={list} />
      )}
    </div>
  );
}

function Stat({ label, value, short, tone }: { label: string; value: string; short: string; tone?: "pos" | "neg" }) {
  return (
    <div className="card min-w-0 px-3 py-2.5" title={value}>
      <p className="eyebrow">{label}</p>
      <p className={`num mt-0.5 truncate font-display text-[17px] font-bold ${tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : ""}`}>
        <span className="sm:hidden">{short}</span><span className="hidden sm:inline">{value}</span>
      </p>
    </div>
  );
}
