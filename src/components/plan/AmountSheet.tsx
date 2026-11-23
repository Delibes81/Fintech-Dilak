"use client";

import { Segmented } from "@/components/ui/Segmented";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { AmountDisplay, AmountPad, numberToPad, padToNumber, pressKey } from "@/components/tx/AmountPad";
import { useHousehold } from "@/store/household";
import { NO_CENTS } from "@/lib/money";

/** Hoja simple para ingresar un monto con el teclado numérico (aportes a metas). */
export function AmountSheet({ open, onOpenChange, title, description, initial = 0, confirmLabel, onConfirm, allowWithdraw }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; initial?: number;
  confirmLabel: (n: number, withdraw: boolean) => string; onConfirm: (n: number, withdraw: boolean) => Promise<boolean>; allowWithdraw?: boolean;
}) {
  const hh = useHousehold();
  const [value, setValue] = useState(() => numberToPad(initial));
  const [withdraw, setWithdraw] = useState(false);
  const [busy, setBusy] = useState(false);
  const n = padToNumber(value);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={description}
      footer={
        <button type="button" className="btn btn-primary btn-lg w-full" disabled={n <= 0 || busy}
          onClick={async () => { setBusy(true); const ok = await onConfirm(n, withdraw); setBusy(false); if (ok) onOpenChange(false); }}>
          {confirmLabel(n, withdraw)}
        </button>
      }>
      <div className="flex flex-col gap-4">
        {allowWithdraw && (
          <Segmented className="self-center" label="Operación" value={withdraw ? "out" : "in"} onChange={(v) => setWithdraw(v === "out")}
            options={[{ value: "in", label: "Aportar" }, { value: "out", label: "Retirar" }]} />
        )}
        <AmountDisplay value={value} currency={hh.household.currency} tone={withdraw ? "expense" : "income"} />
        <AmountPad allowDecimal={!NO_CENTS.has(hh.household.currency)} onKey={(k) => setValue((v) => pressKey(v, k, !NO_CENTS.has(hh.household.currency)))} />
      </div>
    </Sheet>
  );
}
