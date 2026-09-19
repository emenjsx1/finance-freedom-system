import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronUp, Lock, Plus, Wallet } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { WalletForm } from "@/components/wallets/wallet-form";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { moveWallet } from "@/lib/finance/setup-ops";

export const Route = createFileRoute("/app/wallets/")({
  head: () => ({
    meta: [
      { title: "Carteiras — Finance OS" },
      { name: "description", content: "Para que serve o teu dinheiro: propósito, proteção e disponibilidade." },
      { property: "og:title", content: "Carteiras — Finance OS" },
      { property: "og:description", content: "Para que serve o teu dinheiro." },
    ],
  }),
  component: WalletsPage,
});

function WalletsPage() {
  const { setup, update } = useSetup();
  const { snapshot } = useLedger();
  const [formOpen, setFormOpen] = useState(false);

  const wallets = snapshot.wallets.filter((w) => !w.archived);

  return (
    <div>
      <PageHeader title="Carteiras" subtitle="Para que serve o teu dinheiro." />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border/70 bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total organizado</p>
          <Money minor={snapshot.purposeTotalMinor} className="mt-1 block text-lg font-semibold" />
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Por distribuir</p>
          <Money minor={snapshot.unallocatedMinor} className="mt-1 block text-lg font-semibold" />
        </div>
      </div>

      {wallets.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Organiza o teu dinheiro por propósito."
          description="Cada carteira diz para que serve uma parte do teu dinheiro."
          action={<Button onClick={() => setFormOpen(true)}>Criar primeira carteira</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {wallets.map((wallet, index) => (
            <li key={wallet.id} className="flex items-center gap-2">
              <Link
                to="/app/wallets/$walletId"
                params={{ walletId: wallet.id }}
                className="flex flex-1 items-center justify-between rounded-2xl border border-border/70 bg-surface px-4 py-3.5 transition-colors hover:border-muted-foreground/40"
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-10 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${wallet.color ?? "#34d399"}1f` }}
                  >
                    {wallet.icon}
                  </span>
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {wallet.name}
                      {wallet.protectionLevel !== "normal" ? (
                        <Lock className="size-3 text-warning" aria-label="Carteira protegida" />
                      ) : null}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {wallet.percentage}% da regra •{" "}
                      {wallet.includedInAvailable ? "disponível para gastar" : "fora do disponível"}
                    </span>
                  </span>
                </span>
                <Money minor={wallet.balanceMinor} className="text-sm font-semibold" />
              </Link>
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label={`Mover ${wallet.name} para cima`}
                  disabled={index === 0}
                  onClick={() => update(moveWallet(setup, wallet.id, -1))}
                  className="rounded-lg p-1 text-muted-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Mover ${wallet.name} para baixo`}
                  disabled={index === wallets.length - 1}
                  onClick={() => update(moveWallet(setup, wallet.id, 1))}
                  className="rounded-lg p-1 text-muted-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {wallets.length > 0 ? (
        <Button variant="outline" className="mt-4 w-full" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Nova carteira
        </Button>
      ) : null}

      <WalletForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
