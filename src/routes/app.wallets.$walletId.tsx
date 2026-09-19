import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Lock, Minus, Shuffle } from "lucide-react";
import { toast } from "sonner";

import { Money } from "@/components/money";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { useTransactionLauncher } from "@/components/transactions/transaction-launcher";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { WalletForm } from "@/components/wallets/wallet-form";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { walletActivity, walletMonthStats } from "@/lib/finance/engine";
import { setWalletArchived } from "@/lib/finance/setup-ops";
import { PROTECTION_LEVEL_LABELS } from "@/lib/finance/wallet-config";
import { Symbol } from "@/lib/icons/symbols";

export const Route = createFileRoute("/app/wallets/$walletId")({
  head: () => ({
    meta: [
      { title: "Carteira — Norte" },
      { name: "description", content: "Saldo, proteção e atividade desta carteira de propósito." },
      { property: "og:title", content: "Carteira — Norte" },
      { property: "og:description", content: "Saldo, proteção e atividade desta carteira." },
    ],
  }),
  component: WalletDetailPage,
});

function WalletDetailPage() {
  const { walletId } = Route.useParams();
  const navigate = useNavigate();
  const { setup, update } = useSetup();
  const { ledger, snapshot } = useLedger();
  const { openComposer } = useTransactionLauncher();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const wallet = snapshot.wallets.find((w) => w.id === walletId);
  const ruleItem = setup.ruleItems.find((w) => w.id === walletId);
  if (!wallet || !ruleItem) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Carteira não encontrada.{" "}
        <Link to="/app/wallets" className="text-primary underline">
          Voltar às carteiras
        </Link>
      </div>
    );
  }

  const now = new Date();
  const stats = walletMonthStats(ledger.transactions, walletId, now.getFullYear(), now.getMonth());
  const activity = walletActivity(ledger.transactions, walletId).slice(0, 12);

  function archive() {
    update(setWalletArchived(setup, walletId, true));
    toast.success("Carteira arquivada", { description: "O histórico mantém as referências." });
    setArchiveOpen(false);
    void navigate({ to: "/app/wallets" });
  }

  return (
    <div>
      <Link to="/app/wallets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" />
        Carteiras
      </Link>

      <section className="rounded-2xl border border-border/70 bg-surface p-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: `${wallet.color ?? "#34d399"}1f` }}
          >
            <Symbol name={wallet.icon} />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              {wallet.name}
              {wallet.protectionLevel !== "normal" ? <Lock className="size-4 text-warning" /> : null}
            </h1>
            <p className="text-xs text-muted-foreground">
              {wallet.percentage}% da regra • {PROTECTION_LEVEL_LABELS[wallet.protectionLevel]}
            </p>
          </div>
        </div>
        <Money minor={wallet.balanceMinor} className="mt-4 block text-3xl font-semibold" />
        <p className="mt-1 text-xs text-muted-foreground">
          {wallet.includedInAvailable
            ? "Entra no disponível para gastar."
            : "Dinheiro que decidiste não utilizar no dia a dia."}
        </p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/70 bg-surface p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {wallet.wealthBuilding ? "Construído este mês" : "Recebido este mês"}
          </p>
          <Money minor={stats.addedMinor} className="mt-1 block text-sm font-semibold text-income" />
        </div>
        <div className="rounded-xl border border-border/70 bg-surface p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Utilizado este mês</p>
          <Money minor={stats.usedMinor} className="mt-1 block text-sm font-semibold text-expense" />
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => openComposer({ kind: "reallocation" })}>
          <Shuffle className="size-4" />
          Redistribuir
        </Button>
        <Button
          variant="outline"
          disabled={!wallet.spendable}
          onClick={() => openComposer({ kind: "expense" })}
        >
          <Minus className="size-4" />
          Registar despesa
        </Button>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Atividade</h2>
        {activity.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
            Ainda não há movimentos nesta carteira.
          </p>
        ) : (
          <div className="space-y-2">
            {activity.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                categories={ledger.categories}
                accounts={setup.accounts}
                buckets={setup.ruleItems}
                currencyCode={setup.currencyCode}
                onOpen={() => navigate({ to: "/app/activity" })}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setEditOpen(true)}>
          Editar carteira
        </Button>
        {ruleItem.archived ? (
          <Button variant="outline" className="flex-1" onClick={() => update(setWalletArchived(setup, walletId, false))}>
            Reativar carteira
          </Button>
        ) : (
          <Button variant="outline" className="flex-1" onClick={() => setArchiveOpen(true)}>
            Arquivar carteira
          </Button>
        )}
      </div>

      <WalletForm open={editOpen} wallet={ruleItem} onOpenChange={setEditOpen} />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar {wallet.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {wallet.balanceMinor !== 0 ? (
                <>
                  Esta carteira ainda tem <Money minor={wallet.balanceMinor} />. Redistribui o saldo para outra
                  carteira antes de arquivar.
                </>
              ) : (
                "O histórico mantém as referências a esta carteira."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {wallet.balanceMinor !== 0 ? (
              <Button
                onClick={() => {
                  setArchiveOpen(false);
                  openComposer({ kind: "reallocation" });
                }}
              >
                Redistribuir saldo
              </Button>
            ) : (
              <AlertDialogAction onClick={archive}>Arquivar</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
