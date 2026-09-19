import { Check, X } from "lucide-react";

import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { findCategory } from "@/lib/finance/categories";
import type { PreparedAction } from "@/lib/agent/types";

const TYPE_LABEL: Record<PreparedAction["type"], string> = {
  expense: "Despesa",
  income: "Entrada",
  transfer: "Transferência",
  reallocation: "Redistribuição",
  goal_suggestion: "Sugestão de objetivo",
};

/**
 * An action the agent PREPARED. Nothing is written until the user confirms,
 * and the write goes through the financial engine like any manual entry.
 */
export function PreparedActionCard({
  action,
  status,
  onConfirm,
  onCancel,
}: {
  action: PreparedAction;
  status: "pending" | "confirmed" | "cancelled";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { setup } = useSetup();
  const { ledger, snapshot } = useLedger();

  const accountName = (id?: string) => setup.accounts.find((a) => a.id === id)?.name;
  const walletName = (id?: string) => setup.ruleItems.find((w) => w.id === id)?.name;
  const category = findCategory(ledger.categories, action.categoryId)?.name;

  const rows: { label: string; value: string }[] = [];
  if (category) rows.push({ label: "Categoria", value: category });
  if (action.accountId) rows.push({ label: "Conta", value: accountName(action.accountId) ?? "—" });
  if (action.bucketId) rows.push({ label: "Carteira", value: walletName(action.bucketId) ?? "—" });
  if (action.fromAccountId)
    rows.push({ label: "De", value: accountName(action.fromAccountId) ?? "—" });
  if (action.toAccountId) rows.push({ label: "Para", value: accountName(action.toAccountId) ?? "—" });
  if (action.fromBucketId)
    rows.push({ label: "De", value: walletName(action.fromBucketId) ?? "—" });
  if (action.toBucketId) rows.push({ label: "Para", value: walletName(action.toBucketId) ?? "—" });
  if (action.merchant) rows.push({ label: "Descrição", value: action.merchant });

  const sourceWallet = action.bucketId ?? action.fromBucketId;
  const beforeMinor = sourceWallet ? (snapshot.bucketBalances[sourceWallet] ?? 0) : null;

  return (
    <div className="card-standard mt-3 w-full">
      <p className="type-section">{TYPE_LABEL[action.type]} preparada</p>
      <Money minor={action.amountMinor} className="mt-1.5 block text-2xl font-semibold" />

      <dl className="mt-3 space-y-1.5">
        {rows.map((row) => (
          <div key={row.label + row.value} className="flex items-center justify-between gap-4">
            <dt className="type-caption">{row.label}</dt>
            <dd className="text-sm">{row.value}</dd>
          </div>
        ))}
        {beforeMinor !== null && action.type !== "goal_suggestion" ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="type-caption">{walletName(sourceWallet) ?? "Carteira"} depois</dt>
            <dd className="text-sm">
              <Money minor={beforeMinor} /> → <Money minor={beforeMinor - action.amountMinor} />
            </dd>
          </div>
        ) : null}
      </dl>

      {status === "pending" ? (
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={onConfirm}>
            <Check />
            Confirmar
          </Button>
          <Button size="sm" variant="secondary" onClick={onCancel}>
            <X />
            Cancelar
          </Button>
        </div>
      ) : (
        <p className="type-caption mt-4">
          {status === "confirmed" ? "Registada no teu sistema." : "Cancelada. Nada foi registado."}
        </p>
      )}
    </div>
  );
}
