import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/accounts/account-form";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { emitNotificationEvent, haptic, newId, useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { previewAllocation } from "@/lib/finance/engine";
import { orderedWallets } from "@/lib/finance/wallet-config";
import { toMinorUnits } from "@/lib/finance/currency";
import type { Allocation, Transaction } from "@/lib/finance/ledger-types";
import type { Account } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Mode = "rule" | "manual" | "single";

/**
 * Balance verification. A difference never overwrites a balance — it always
 * becomes an auditable BALANCE_ADJUSTMENT event with an explicit purpose.
 */
export function ReconcileSheet({
  open,
  account,
  onOpenChange,
}: {
  open: boolean;
  account: Account;
  onOpenChange: (open: boolean) => void;
}) {
  const { setup } = useSetup();
  const { snapshot, addTransaction } = useLedger();
  const currency = account.currencyCode ?? setup.currencyCode;
  const appMinor = snapshot.accountBalances[account.id] ?? 0;

  const [realValue, setRealValue] = useState("");
  const [reason, setReason] = useState("Correção de saldo");
  const [mode, setMode] = useState<Mode>("rule");
  const [singleWalletId, setSingleWalletId] = useState("");
  const [manual, setManual] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const wallets = orderedWallets(setup.ruleItems);
  const realMinor = realValue.trim() ? toMinorUnits(realValue, currency) : null;
  const differenceMinor = realMinor === null ? 0 : realMinor - appMinor;
  const absMinor = Math.abs(differenceMinor);
  const direction: "positive" | "negative" = differenceMinor >= 0 ? "positive" : "negative";

  const allocations: Allocation[] = useMemo(() => {
    if (absMinor === 0) return [];
    if (mode === "rule") return previewAllocation(absMinor, wallets).filter((a) => a.amountMinor > 0);
    if (mode === "single") return singleWalletId ? [{ bucketId: singleWalletId, amountMinor: absMinor }] : [];
    return wallets
      .map((w) => ({ bucketId: w.id, amountMinor: toMinorUnits(manual[w.id] ?? "0", currency) }))
      .filter((a) => a.amountMinor > 0);
  }, [absMinor, mode, singleWalletId, manual, wallets, currency]);

  const allocated = allocations.reduce((sum, a) => sum + a.amountMinor, 0);
  const balancedPurpose = allocated === absMinor;

  function confirm() {
    if (saving || realMinor === null || absMinor === 0 || !reason.trim() || !balancedPurpose) return;
    setSaving(true);
    const now = new Date().toISOString();
    const tx: Transaction = {
      id: newId(),
      kind: "adjustment",
      amountMinor: absMinor,
      direction,
      occurredAt: now,
      createdAt: now,
      moneyType: "personal",
      accountId: account.id,
      allocations,
      adjustmentReason: reason.trim(),
      description: `Ajuste de saldo — ${account.name}`,
      tags: [],
      attachments: [],
    };
    addTransaction(tx);
    emitNotificationEvent("balance_adjusted", { accountId: account.id, amountMinor: absMinor, direction });
    emitNotificationEvent("account_reconciled", { accountId: account.id });
    haptic("success");
    toast.success("Saldo reconciliado", { description: `${account.name} atualizado com um ajuste registado no histórico.` });
    setSaving(false);
    setRealValue("");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl lg:max-w-lg">
        <SheetHeader className="px-0">
          <SheetTitle>Verificar saldo</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          <div className="rounded-2xl border border-border/70 bg-surface p-4">
            <Row label="Saldo na app" value={<Money minor={appMinor} currency={currency} className="font-semibold" />} />
            {realMinor !== null ? (
              <>
                <Row label="Saldo real" value={<Money minor={realMinor} currency={currency} className="font-semibold" />} />
                <Row
                  label="Diferença"
                  value={
                    <Money
                      minor={differenceMinor}
                      currency={currency}
                      options={{ signDisplay: "always" }}
                      className={cn("font-semibold", differenceMinor >= 0 ? "text-income" : "text-expense")}
                    />
                  }
                />
              </>
            ) : null}
          </div>

          <Field label="Saldo real na conta" htmlFor="rec-real">
            <Input
              id="rec-real"
              inputMode="decimal"
              value={realValue}
              placeholder="0"
              onChange={(e) => setRealValue(e.target.value.replace(/[^\d.,]/g, ""))}
            />
          </Field>

          {realMinor !== null && absMinor === 0 ? (
            <p className="rounded-xl border border-border/70 bg-surface px-4 py-3 text-sm text-muted-foreground">
              O saldo da app já corresponde ao saldo real. Nada a corrigir.
            </p>
          ) : null}

          {absMinor > 0 ? (
            <>
              <Field label="Motivo" htmlFor="rec-reason">
                <Input
                  id="rec-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 120))}
                />
              </Field>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {direction === "positive"
                    ? "Que propósito recebe este dinheiro?"
                    : "Que carteiras absorvem esta redução?"}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <ModeButton active={mode === "rule"} onClick={() => setMode("rule")} label="Regra" />
                  <ModeButton active={mode === "single"} onClick={() => setMode("single")} label="Uma carteira" />
                  <ModeButton active={mode === "manual"} onClick={() => setMode("manual")} label="Manual" />
                </div>
              </div>

              {mode === "single" ? (
                <select
                  aria-label="Carteira"
                  className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
                  value={singleWalletId}
                  onChange={(e) => setSingleWalletId(e.target.value)}
                >
                  <option value="">Escolher carteira</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.icon} {w.name}
                    </option>
                  ))}
                </select>
              ) : null}

              {mode === "manual" ? (
                <div className="space-y-2">
                  {wallets.map((w) => (
                    <div key={w.id} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-sm">
                        {w.icon} {w.name}
                      </span>
                      <Input
                        aria-label={w.name}
                        inputMode="decimal"
                        value={manual[w.id] ?? ""}
                        onChange={(e) =>
                          setManual((prev) => ({ ...prev, [w.id]: e.target.value.replace(/[^\d.,]/g, "") }))
                        }
                      />
                    </div>
                  ))}
                  {!balancedPurpose ? (
                    <p className="text-xs text-warning">
                      Distribui exatamente a diferença. Nenhum dinheiro fica sem propósito.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {mode === "rule" ? (
                <ul className="space-y-1 rounded-xl border border-border/70 bg-surface px-4 py-3">
                  {allocations.map((a) => {
                    const wallet = wallets.find((w) => w.id === a.bucketId);
                    return (
                      <li key={a.bucketId} className="flex justify-between text-sm">
                        <span>
                          {wallet?.icon} {wallet?.name}
                        </span>
                        <Money minor={a.amountMinor} currency={currency} className="text-muted-foreground" />
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <Button
                className="w-full"
                onClick={confirm}
                disabled={saving || !reason.trim() || !balancedPurpose || allocations.length === 0}
              >
                Reconciliar
              </Button>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {value}
    </div>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border px-3 py-2 text-xs font-medium",
        active ? "border-primary bg-primary-soft text-primary" : "border-border/70 text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
