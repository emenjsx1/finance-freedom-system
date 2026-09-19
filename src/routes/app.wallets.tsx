import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useSetup } from "@/hooks/use-setup";
import { formatMoney } from "@/lib/finance/currency";

export const Route = createFileRoute("/app/wallets")({
  head: () => ({
    meta: [
      { title: "Contas — Finance OS" },
      { name: "description", content: "Onde o teu dinheiro existe fisicamente: banco, carteira móvel e numerário." },
      { property: "og:title", content: "Contas — Finance OS" },
      { property: "og:description", content: "Onde o teu dinheiro existe fisicamente." },
    ],
  }),
  component: WalletsPage,
});

function WalletsPage() {
  const { setup } = useSetup();

  return (
    <div>
      <PageHeader title="As minhas contas" subtitle="Conta = lugar físico. Pote = propósito." />
      {setup.accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sem contas"
          description="Adiciona as tuas contas na configuração inicial ou aqui, quando a ligação estiver ativa."
        />
      ) : (
        <ul className="space-y-2">
          {setup.accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{account.name}</p>
                <p className="text-xs text-muted-foreground">{labelForType(account.type)}</p>
              </div>
              <span className="numeric text-sm font-semibold">
                {formatMoney(account.balanceMinor, setup.currencyCode)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function labelForType(type: string): string {
  const labels: Record<string, string> = {
    bank: "Conta bancária",
    mobile_wallet: "Carteira móvel",
    cash: "Numerário",
    savings: "Poupança",
    card: "Cartão",
    other: "Outro",
  };
  return labels[type] ?? "Outro";
}
