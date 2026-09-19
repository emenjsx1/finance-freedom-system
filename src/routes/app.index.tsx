import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Hammer, Lock, Map, Receipt, Wallet } from "lucide-react";
import type { ComponentType } from "react";

import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { useTransactionLauncher } from "@/components/transactions/transaction-launcher";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { greetingFor } from "@/lib/finance/greeting";
import { monthTotals } from "@/lib/finance/engine";
import { pt } from "@/lib/i18n/pt";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Painel — Finance OS" },
      { name: "description", content: "O teu património pessoal e o dinheiro disponível para gastar, num só painel." },
      { property: "og:title", content: "Painel — Finance OS" },
      { property: "og:description", content: "O teu património pessoal e o dinheiro disponível para gastar." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { setup } = useSetup();
  const { ledger, snapshot } = useLedger();
  const { openQuickActions, openComposer } = useTransactionLauncher();

  const now = new Date();
  const totals = monthTotals(ledger.transactions, now.getFullYear(), now.getMonth(), setup.ruleItems);
  const recent = [...ledger.transactions]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5);
  const firstName = setup.fullName.trim().split(" ")[0] ?? "";
  const wallets = snapshot.wallets.filter((w) => !w.archived);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">
          {greetingFor()}
          {firstName ? `, ${firstName}` : ""}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Aqui está o teu sistema</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{pt.home.wealth}</p>
          <Money minor={snapshot.wealthMinor} className="mt-2 block text-3xl font-semibold" />
          <p className="mt-1 text-xs text-muted-foreground">Tudo o que existe nas tuas contas</p>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary-soft p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{pt.home.spendable}</p>
          <Money minor={snapshot.spendableMinor} className="mt-2 block text-3xl font-semibold text-primary" />
          <p className="mt-1 text-xs text-primary/80">Só as carteiras que marcaste como disponíveis</p>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
          <span className="flex items-center gap-2 text-sm">
            <Lock className="size-4 text-warning" aria-hidden />
            Dinheiro protegido
          </span>
          <Money minor={snapshot.protectedMinor} className="text-sm font-semibold" />
        </div>
        <Link
          to="/app/money-map"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm transition-colors hover:border-muted-foreground/40"
        >
          <span className="flex items-center gap-2">
            <Map className="size-4 text-primary" aria-hidden />
            Ver mapa do dinheiro
          </span>
          <span aria-hidden className="text-muted-foreground">
            →
          </span>
        </Link>
      </section>

      {snapshot.unallocatedMinor > 0 ? (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm font-medium">
            <Money minor={snapshot.unallocatedMinor} /> ainda não têm propósito.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Podes distribuir pela tua regra financeira ou manualmente.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => openComposer({ kind: "reallocation" })}>
              Distribuir agora
            </Button>
            <Link
              to="/app/money-map"
              className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm"
            >
              Ver detalhe
            </Link>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{pt.home.buckets}</h2>
          <Link to="/app/wallets" className="text-xs text-primary underline">
            Ver carteiras
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {wallets.map((wallet) => (
            <Link
              key={wallet.id}
              to="/app/wallets/$walletId"
              params={{ walletId: wallet.id }}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-muted-foreground/40"
            >
              <span className="flex items-center gap-3 text-sm font-medium">
                <span aria-hidden>{wallet.icon}</span>
                {wallet.name}
                {wallet.protectionLevel !== "normal" ? (
                  <Lock className="size-3 text-warning" aria-label="protegida" />
                ) : null}
              </span>
              <Money minor={wallet.balanceMinor} className="text-sm text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{pt.home.monthSummary}</h2>
        <div className="grid grid-cols-3 gap-2">
          <SummaryTile label={pt.home.income} icon={ArrowDownLeft} minor={totals.income} tone="income" />
          <SummaryTile label={pt.home.expenses} icon={ArrowUpRight} minor={totals.expenses} tone="expense" />
          <SummaryTile label={pt.home.built} icon={Hammer} minor={totals.built} tone="wealth" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Atividade recente</h2>
          <Link to="/app/transactions" className="text-xs text-primary underline">
            Ver tudo
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="A tua história financeira começa aqui."
            description="Regista a tua primeira entrada ou gasto para o sistema começar a distribuir o dinheiro."
            action={<Button onClick={openQuickActions}>Adicionar primeira transação</Button>}
          />
        ) : (
          <div className="space-y-2">
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                categories={ledger.categories}
                accounts={setup.accounts}
                buckets={setup.ruleItems}
                currencyCode={setup.currencyCode}
                onOpen={() => undefined}
              />
            ))}
          </div>
        )}
      </section>

      {setup.accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Adiciona onde guardas o teu dinheiro."
          description="Banco, carteira móvel, numerário — cada lugar onde o dinheiro existe."
          action={
            <Link to="/app/accounts" className="inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              Adicionar conta
            </Link>
          }
        />
      ) : null}
    </div>
  );
}

function SummaryTile({
  label,
  minor,
  icon: Icon,
  tone,
}: {
  label: string;
  minor: number;
  icon: ComponentType<{ className?: string }>;
  tone: "income" | "expense" | "wealth";
}) {
  const toneClass = tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-wealth";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Icon className={`size-4 ${toneClass}`} />
      <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <Money minor={minor} className="mt-0.5 block text-sm font-semibold" options={{ compactDecimals: true }} />
    </div>
  );
}
