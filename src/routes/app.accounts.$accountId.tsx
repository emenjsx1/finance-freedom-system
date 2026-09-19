import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowLeftRight, Minus, Plus, ScaleIcon } from "lucide-react";
import { toast } from "sonner";

import { AccountForm } from "@/components/accounts/account-form";
import { ReconcileSheet } from "@/components/accounts/reconcile-sheet";
import { Money } from "@/components/money";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { useTransactionLauncher } from "@/components/transactions/transaction-launcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { accountMonthStats } from "@/lib/finance/engine";
import { setAccountArchived } from "@/lib/finance/setup-ops";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/types";
import { Symbol } from "@/lib/icons/symbols";

export const Route = createFileRoute("/app/accounts/$accountId")({
  head: () => ({
    meta: [
      { title: "Conta — Finance OS" },
      { name: "description", content: "Saldo, entradas, saídas e transferências desta conta." },
      { property: "og:title", content: "Conta — Finance OS" },
      { property: "og:description", content: "Saldo, entradas, saídas e transferências desta conta." },
    ],
  }),
  component: AccountDetailPage,
});

function AccountDetailPage() {
  const { accountId } = Route.useParams();
  const navigate = useNavigate();
  const { setup, update } = useSetup();
  const { ledger, snapshot } = useLedger();
  const { openComposer } = useTransactionLauncher();

  const [editOpen, setEditOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const account = setup.accounts.find((a) => a.id === accountId);
  if (!account) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Conta não encontrada.{" "}
        <Link to="/app/accounts" className="text-primary underline">
          Voltar às contas
        </Link>
      </div>
    );
  }

  const currency = account.currencyCode ?? setup.currencyCode;
  const balance = snapshot.accountBalances[account.id] ?? 0;
  const now = new Date();
  const stats = accountMonthStats(ledger.transactions, account.id, now.getFullYear(), now.getMonth());
  const activity = ledger.transactions
    .filter((tx) => tx.accountId === account.id || tx.fromAccountId === account.id || tx.toAccountId === account.id)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 12);

  function archive() {
    update(setAccountArchived(setup, accountId, true));
    toast.success("Conta arquivada", { description: "O histórico mantém-se intacto." });
    setArchiveOpen(false);
    void navigate({ to: "/app/accounts" });
  }

  return (
    <div>
      <Link to="/app/accounts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" />
        Minhas contas
      </Link>

      <section className="rounded-2xl border border-border/70 bg-surface p-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: `${account.color ?? "#34d399"}1f` }}
          >
            <Symbol name={account.icon ?? "bank"} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">
              {account.name}
              {account.last4 ? ` •••• ${account.last4}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground">
              {ACCOUNT_TYPE_LABELS[account.type]}
              {account.institution ? ` • ${account.institution}` : ""} • {currency}
            </p>
          </div>
        </div>
        <Money minor={balance} currency={currency} className="mt-4 block text-3xl font-semibold" />
        {!account.includeInNetWorth ? (
          <p className="mt-1 text-xs text-muted-foreground">Não conta para o teu património.</p>
        ) : null}
      </section>

      <section className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Recebido este mês" minor={stats.inMinor} currency={currency} tone="text-income" />
        <Stat label="Gasto este mês" minor={stats.outMinor} currency={currency} tone="text-expense" />
        <Stat label="Transferências" minor={stats.transfersMinor} currency={currency} tone="text-info" />
      </section>
      <p className="mt-2 text-xs text-muted-foreground">
        {stats.count} transações este mês. As transferências internas não contam como gastos.
      </p>

      <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Action icon={ArrowLeftRight} label="Transferir" onClick={() => openComposer({ kind: "transfer" })} />
        <Action icon={Plus} label="Entrada" onClick={() => openComposer({ kind: "income" })} />
        <Action icon={Minus} label="Despesa" onClick={() => openComposer({ kind: "expense" })} />
        <Action icon={ScaleIcon} label="Verificar saldo" onClick={() => setReconcileOpen(true)} />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Transações recentes</h2>
        {activity.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
            Ainda não há movimentos nesta conta.
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
          Editar conta
        </Button>
        {account.archived ? (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => update(setAccountArchived(setup, accountId, false))}
          >
            Reativar conta
          </Button>
        ) : (
          <Button variant="outline" className="flex-1" onClick={() => setArchiveOpen(true)}>
            Arquivar conta
          </Button>
        )}
      </div>

      <AccountForm open={editOpen} account={account} onOpenChange={setEditOpen} />
      <ReconcileSheet open={reconcileOpen} account={account} onOpenChange={setReconcileOpen} />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar {account.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {balance !== 0 ? (
                <>
                  Esta conta ainda possui <Money minor={balance} currency={currency} />. Transfere o saldo para outra
                  conta ou reconcilia para zero antes de arquivar.
                </>
              ) : (
                "O histórico mantém-se. Podes reativar a conta quando quiseres."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {balance !== 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setArchiveOpen(false);
                    openComposer({ kind: "transfer" });
                  }}
                >
                  Transferir saldo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setArchiveOpen(false);
                    setReconcileOpen(true);
                  }}
                >
                  Reconciliar para zero
                </Button>
              </>
            ) : (
              <AlertDialogAction onClick={archive}>Arquivar</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  label,
  minor,
  currency,
  tone,
}: {
  label: string;
  minor: number;
  currency: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <Money minor={minor} currency={currency} className={`mt-1 block text-sm font-semibold ${tone}`} />
    </div>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-surface px-2 py-3 text-xs font-medium transition-colors hover:border-muted-foreground/40"
    >
      <Icon className="size-4 text-primary" />
      {label}
    </button>
  );
}
