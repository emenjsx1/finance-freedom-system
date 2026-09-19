import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, PiggyBank, Settings2 } from "lucide-react";

import { Money } from "@/components/money";
import { ProgressIndicator } from "@/components/design/progress-indicator";
import { SectionHeader } from "@/components/design/section-header";
import { useTransactionLauncher } from "@/components/transactions/transaction-launcher";
import { Button } from "@/components/ui/button";
import { WalletForm } from "@/components/wallets/wallet-form";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { walletActivity } from "@/lib/finance/engine";
import { Symbol, symbolLabel } from "@/lib/icons/symbols";
import type { Transaction } from "@/lib/finance/ledger-types";

export const Route = createFileRoute("/app/goals/$goalId")({
  head: () => ({
    meta: [
      { title: "Objetivo — Norte" },
      { name: "description", content: "Quanto já guardaste, quanto falta e quando queres lá chegar." },
      { property: "og:title", content: "Objetivo — Norte" },
      { property: "og:description", content: "Progresso e contribuições deste objetivo." },
    ],
  }),
  component: GoalDetailPage,
});

/** How much this transaction moved into (+) or out of (−) the goal. */
function deltaFor(tx: Transaction, goalId: string): number {
  if (tx.kind === "income" || tx.kind === "adjustment") {
    return (tx.allocations ?? [])
      .filter((a) => a.bucketId === goalId)
      .reduce((sum, a) => sum + a.amountMinor, 0) * (tx.direction === "negative" ? -1 : 1);
  }
  if (tx.kind === "reallocation") {
    if (tx.toBucketId === goalId) return tx.amountMinor;
    if (tx.fromBucketId === goalId) return -tx.amountMinor;
  }
  if (tx.kind === "expense" && tx.bucketId === goalId) return -tx.amountMinor;
  return 0;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "Hoje";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (same(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

function GoalDetailPage() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();
  const { setup } = useSetup();
  const { ledger, snapshot } = useLedger();
  const { openComposer } = useTransactionLauncher();
  const [editOpen, setEditOpen] = useState(false);

  const wallet = snapshot.wallets.find((w) => w.id === goalId);
  const ruleItem = setup.ruleItems.find((w) => w.id === goalId);

  const contributions = useMemo(() => {
    if (!wallet) return [];
    return walletActivity(ledger.transactions, goalId)
      .map((tx) => ({ tx, delta: deltaFor(tx, goalId) }))
      .filter((row) => row.delta !== 0);
  }, [ledger.transactions, goalId, wallet]);

  if (!wallet || !ruleItem) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Objetivo não encontrado.{" "}
        <Link to="/app/goals" className="text-primary underline">
          Voltar aos objetivos
        </Link>
      </div>
    );
  }

  const targetMinor = ruleItem.targetMinor ?? 0;
  const ratio = targetMinor > 0 ? wallet.balanceMinor / targetMinor : 0;
  const remaining = Math.max(0, targetMinor - wallet.balanceMinor);

  return (
    <div className="space-y-8">
      <Link to="/app/goals" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Objetivos
      </Link>

      <section className="card-hero overflow-hidden p-0">
        {ruleItem.coverImageUrl ? (
          <img
            src={ruleItem.coverImageUrl}
            alt=""
            className="h-40 w-full object-cover"
            width={900}
            height={320}
          />
        ) : null}
        <div className="p-5">
          <div className="flex items-center gap-3">
            {ruleItem.coverImageUrl ? null : (
              <span className="icon-tile bg-accent text-accent-foreground" aria-hidden>
                <Symbol name={wallet.icon} />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="type-heading truncate">{wallet.name}</h1>
              <p className="type-meta">
                {symbolLabel(wallet.icon)}
                {ruleItem.targetDate
                  ? ` · até ${new Date(ruleItem.targetDate).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}`
                  : ""}
              </p>
            </div>
          </div>

          <p className="mt-5 flex items-baseline gap-2">
            <Money
              minor={wallet.balanceMinor}
              options={{ withSymbol: false, compactDecimals: true }}
              className="type-display tabular-nums"
            />
            <span className="type-caption">{setup.currencyCode}</span>
          </p>
          {targetMinor > 0 ? (
            <p className="type-secondary mt-1">
              de <Money minor={targetMinor} options={{ withSymbol: false, compactDecimals: true }} />{" "}
              {setup.currencyCode} · faltam{" "}
              <Money minor={remaining} options={{ withSymbol: false, compactDecimals: true }} />
            </p>
          ) : (
            <p className="type-secondary mt-1">Sem valor-alvo definido.</p>
          )}

          {targetMinor > 0 ? (
            <div className="mt-5">
              <ProgressIndicator value={ratio} label={`Progresso de ${wallet.name}`} />
              <p className="type-meta mt-2">
                {Math.round(Math.min(1, Math.max(0, ratio)) * 100)}% construído
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex gap-2">
            <Button
              className="flex-1"
              onClick={() => openComposer({ kind: "reservation", preset: { toBucketId: goalId } })}
            >
              <PiggyBank className="size-4" aria-hidden /> Guardar dinheiro
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)} aria-label="Editar objetivo">
              <Settings2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Contribuições" />
        {contributions.length === 0 ? (
          <p className="type-secondary mt-2">
            Ainda não guardaste nada para este objetivo. Toca em Guardar dinheiro para começar.
          </p>
        ) : (
          <ul className="list-group mt-3">
            {contributions.slice(0, 30).map(({ tx, delta }) => (
              <li key={tx.id} className="list-row">
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-medium">{dayLabel(tx.occurredAt)}</span>
                  <span className="type-meta block truncate">
                    {tx.description || tx.merchant || (delta > 0 ? "Dinheiro guardado" : "Dinheiro retirado")}
                  </span>
                </span>
                <span className={delta > 0 ? "tabular-nums text-income" : "tabular-nums text-expense"}>
                  {delta > 0 ? "+" : "−"}
                  <Money minor={Math.abs(delta)} options={{ withSymbol: false, compactDecimals: true }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WalletForm open={editOpen} wallet={ruleItem} onOpenChange={setEditOpen} />

      <button
        type="button"
        onClick={() => navigate({ to: "/app/wallets/$walletId", params: { walletId: goalId } })}
        className="type-meta underline"
      >
        Ver definições avançadas desta carteira
      </button>
    </div>
  );
}
