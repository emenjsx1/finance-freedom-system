/**
 * Separar dinheiro para um plano.
 *
 * Two questions, then a preview: how much, and from which account the money is.
 * Reserving is a classification — the account keeps the exact same balance, only
 * the purpose of that money changes. `accountId` records where the reserved
 * money physically sits, so "onde está" and "para quê" stay two readings of the
 * same money.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { NativeSheet } from "@/components/design/native-sheet";
import { Money } from "@/components/money";
import { AmountInput } from "@/components/transactions/amount-input";
import { Button } from "@/components/ui/button";
import { newId, useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import { financialPosition } from "@/lib/finance/position";
import { upsertWallet } from "@/lib/finance/setup-ops";
import { PLAN_TYPE_SYMBOL, type Plan } from "@/lib/personal/types";

export function PlanFundingSheet({
  plan,
  open,
  onOpenChange,
}: {
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { setup, update } = useSetup();
  const { snapshot, addTransaction } = useLedger();
  const { updatePlan } = usePersonal();

  const [amountMinor, setAmountMinor] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const position = financialPosition(snapshot);
  const accounts = useMemo(
    () =>
      [...setup.accounts]
        .filter((a) => !a.archived)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [setup.accounts],
  );

  const savedMinor = plan.walletId ? (snapshot.bucketBalances[plan.walletId] ?? 0) : 0;
  const account = accounts.find((a) => a.id === accountId);
  const tooMuch = amountMinor > position.availableMinor;

  function reset() {
    setAmountMinor(0);
    setAccountId(null);
    setConfirming(false);
  }

  function confirm() {
    // One plan, one purpose. Reuse an existing purpose with the same identity
    // instead of creating a second "Turquia" alongside the plan.
    let walletId =
      plan.walletId ??
      setup.ruleItems.find(
        (r) => r.planId === plan.id || r.name.trim().toLowerCase() === plan.name.trim().toLowerCase(),
      )?.id;
    if (!walletId) {
      walletId = newId();
      update(
        upsertWallet(setup, {
          id: walletId,
          name: plan.name,
          percentage: 0,
          source: "plan",
          planId: plan.id,
          icon: plan.symbol ?? PLAN_TYPE_SYMBOL[plan.type],
          kind: "goals",
          ...(plan.targetMinor ? { targetMinor: plan.targetMinor } : {}),
          ...(plan.targetDate ? { targetDate: plan.targetDate } : {}),
        }),
      );
    }
    if (plan.walletId !== walletId) updatePlan(plan.id, { walletId, financial: true });

    const now = new Date().toISOString();
    const ok = addTransaction({
      id: newId(),
      kind: "reservation",
      amountMinor,
      occurredAt: now,
      createdAt: now,
      moneyType: "personal",
      tags: ["plano"],
      attachments: [],
      description: `Separado para ${plan.name}`,
      toBucketId: walletId,
      ...(accountId ? { accountId } : {}),
    });

    if (!ok) {
      toast.error("Não foi possível separar este dinheiro.");
      return;
    }
    onOpenChange(false);
    reset();
  }

  return (
    <NativeSheet
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) reset();
      }}
      title={confirming ? "Rever" : `Separar dinheiro para ${plan.name}`}
      description={
        confirming
          ? "O dinheiro continua na mesma conta. Só passa a ter um destino."
          : "Separar não move dinheiro entre contas."
      }
    >
      {confirming ? (
        <div className="space-y-4">
          <ul className="list-group">
            <li className="list-row justify-between">
              <span>Adicionar</span>
              <Money minor={amountMinor} className="font-semibold" />
            </li>
            {account ? (
              <li className="list-row justify-between">
                <span>De</span>
                <span>{account.name}</span>
              </li>
            ) : null}
          </ul>
          <p className="type-meta">Depois</p>
          <ul className="list-group">
            <li className="list-row justify-between">
              <span>{plan.name}</span>
              <span>
                <Money minor={savedMinor + amountMinor} />
                {plan.targetMinor ? (
                  <>
                    {" de "}
                    <Money minor={plan.targetMinor} />
                  </>
                ) : null}
              </span>
            </li>
            <li className="list-row justify-between">
              <span>Disponível</span>
              <Money minor={position.availableMinor - amountMinor} />
            </li>
            {account ? (
              <li className="list-row justify-between">
                <span>{account.name}</span>
                <Money minor={snapshot.accountBalances[account.id] ?? 0} />
              </li>
            ) : null}
            <li className="list-row justify-between">
              <span>Total</span>
              <Money minor={position.totalMinor} />
            </li>
          </ul>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Voltar
            </Button>
            <Button className="flex-1" onClick={confirm}>
              Confirmar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <AmountInput
              valueMinor={amountMinor}
              onChange={setAmountMinor}
              currencyCode={setup.currencyCode}
              label={`Quanto queres separar para ${plan.name}?`}
              autoFocus
            />
            <p className="mt-2 type-meta">
              Disponível: <Money minor={position.availableMinor} />
            </p>
            {tooMuch ? (
              <p className="mt-1 text-sm text-destructive">
                Estás a separar mais do que está disponível.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="type-meta">De onde vem este dinheiro?</p>
            {accounts.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={accountId === item.id}
                onClick={() => setAccountId(item.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                  accountId === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border/70 bg-surface"
                }`}
              >
                <span className="text-sm font-medium">{item.name}</span>
                <Money minor={snapshot.accountBalances[item.id] ?? 0} className="text-sm" />
              </button>
            ))}
            <p className="type-meta">
              A conta mantém o mesmo saldo. Só ficamos a saber onde está o dinheiro reservado.
            </p>
          </div>

          <Button
            className="w-full"
            disabled={amountMinor <= 0 || tooMuch}
            onClick={() => setConfirming(true)}
          >
            Continuar
          </Button>
        </div>
      )}
    </NativeSheet>
  );
}
