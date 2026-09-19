import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Wallet } from "lucide-react";

import { AccountForm } from "@/components/accounts/account-form";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { moveAccount } from "@/lib/finance/setup-ops";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/types";

export const Route = createFileRoute("/app/accounts/")({
  head: () => ({
    meta: [
      { title: "Minhas contas — Finance OS" },
      { name: "description", content: "Onde o teu dinheiro existe fisicamente: banco, carteira móvel e numerário." },
      { property: "og:title", content: "Minhas contas — Finance OS" },
      { property: "og:description", content: "Onde o teu dinheiro existe fisicamente." },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const { setup, update } = useSetup();
  const { snapshot } = useLedger();
  const [formOpen, setFormOpen] = useState(false);

  const accounts = [...setup.accounts]
    .filter((a) => !a.archived)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const archived = setup.accounts.filter((a) => a.archived);

  return (
    <div>
      <PageHeader title="Contas" subtitle="Onde o teu dinheiro existe fisicamente." />

      <div className="card-hero mb-6">
        <p className="type-caption">Total nas contas</p>
        <Money minor={snapshot.wealthMinor} className="type-display mt-2 block" />
        {snapshot.totalsByCurrency.length > 1 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Inclui valores convertidos com taxas que indicaste manualmente.
          </p>
        ) : null}
        {snapshot.unconvertedCurrencies.length > 0 ? (
          <p className="mt-1 text-xs text-warning">
            Sem taxa de câmbio para {snapshot.unconvertedCurrencies.join(", ")} — esses saldos ficam de fora do total.
          </p>
        ) : null}
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Adiciona onde guardas o teu dinheiro."
          description="Banco, carteira móvel, numerário — cada lugar onde o dinheiro existe."
          action={<Button onClick={() => setFormOpen(true)}>Adicionar conta</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {accounts.map((account, index) => (
            <li key={account.id} className="flex items-center gap-2">
              <Link
                to="/app/accounts/$accountId"
                params={{ accountId: account.id }}
                className="flex flex-1 items-center justify-between rounded-2xl border border-border/70 bg-surface px-4 py-3.5 transition-colors hover:border-muted-foreground/40"
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-10 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${account.color ?? "#34d399"}1f` }}
                  >
                    {account.icon ?? "🏦"}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">
                      {account.name}
                      {account.last4 ? ` •••• ${account.last4}` : ""}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                      {account.currencyCode && account.currencyCode !== setup.currencyCode
                        ? ` • ${account.currencyCode}`
                        : ""}
                    </span>
                  </span>
                </span>
                <Money
                  minor={snapshot.accountBalances[account.id] ?? 0}
                  currency={account.currencyCode ?? setup.currencyCode}
                  className="text-sm font-semibold"
                />
              </Link>
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label={`Mover ${account.name} para cima`}
                  disabled={index === 0}
                  onClick={() => update(moveAccount(setup, account.id, -1))}
                  className="rounded-lg p-1 text-muted-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Mover ${account.name} para baixo`}
                  disabled={index === accounts.length - 1}
                  onClick={() => update(moveAccount(setup, account.id, 1))}
                  className="rounded-lg p-1 text-muted-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Arquivadas</h2>
          <ul className="space-y-2">
            {archived.map((account) => (
              <li key={account.id}>
                <Link
                  to="/app/accounts/$accountId"
                  params={{ accountId: account.id }}
                  className="flex items-center justify-between rounded-2xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground"
                >
                  {account.name}
                  <Money minor={snapshot.accountBalances[account.id] ?? 0} currency={account.currencyCode} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {accounts.length > 0 ? (
        <Button variant="outline" className="mt-4 w-full" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Nova conta
        </Button>
      ) : null}

      <AccountForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
