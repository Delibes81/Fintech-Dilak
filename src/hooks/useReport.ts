"use client";
import { useMemo } from "react";
import { useHousehold } from "@/store/household";
import { buildReport, healthScore, historyMonths, insights } from "@/lib/finance/engine";

/** Reporte financiero del mes (por defecto, el elegido en el encabezado). */
export function useReport(ymArg?: string) {
  const { ym: selected, months, categories, recurring, goals, household, today, fmt } = useHousehold();
  const ym = ymArg ?? selected;
  const txs = months[ym];
  const prev = historyMonths(ym).map((m) => months[m]);
  const key = prev.map((p) => (p ? p.length : -1)).join(",");

  return useMemo(() => {
    const report = buildReport({
      ym, today, txs: txs ?? [], history: prev, categories, recurring, savingsTargetPct: household.savings_target_pct,
    });
    const health = healthScore(report, goals, household.savings_target_pct);
    const tips = insights(report, goals, household.savings_target_pct, fmt);
    return { loading: !txs, report, health, tips };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym, today, txs, key, categories, recurring, goals, household.savings_target_pct, fmt]);
}
