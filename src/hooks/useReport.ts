"use client";
import { useMemo } from "react";
import { useHousehold } from "@/store/household";
import { buildReport, healthScore, historyMonths, insights, TONE_ORDER } from "@/lib/finance/engine";
import { foodAppsInsight, foodAppsSummary } from "@/lib/finance/foodApps";

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
    // Apps de comida (Uber Eats, Rappi, DiDi Food): se suma su consejo a los del asesor
    const food = foodAppsSummary(txs ?? [], prev, categories, ym, today);
    const foodTip = foodAppsInsight(food, fmt);
    const tips = [...insights(report, goals, household.savings_target_pct, fmt), ...(foodTip ? [foodTip] : [])]
      .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
    return { loading: !txs, report, health, tips, food };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym, today, txs, key, categories, recurring, goals, household.savings_target_pct, fmt]);
}
