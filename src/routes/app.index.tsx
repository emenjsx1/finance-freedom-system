import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Hammer, Receipt, Wallet } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { useSetup } from "@/hooks/use-setup";
import { formatMoney } from "@/lib/finance/currency";
import { greetingFor } from "@/lib/finance/greeting";
import { spendableMinor, totalWealthMinor } from "@/lib/finance/allocation";
import { pt } from "@/lib/i18n/pt";
import type { Bucket } from "@/lib/finance/types";

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
  const currency = setup.currencyCode;

  const buckets: Bucket[] = setup.ruleItems.map((item) => ({
    id: item.id,
    name: item.name,
    kind: item.kind,
    icon: item.icon,
    balanceMinor: 0,
  }));

  const wealth = totalWealthMinor(setup.accounts);
  const spendable = spendableMinor(buckets);
  const firstName = setup.fullName.trim().split(" ")[0] ?? "";

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
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {pt.home.wealth}
          </p>
          <p className="numeric mt-2 text-3xl font-semibold">{formatMoney(wealth, currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Tudo o que existe nas tuas contas</p>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary-soft p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {pt.home.spendable}
          </p>
          <p className="numeric mt-2 text-3xl font-semibold text-primary">
            {formatMoney(spendable, currency)}
          </p>
          <p className="mt-1 text-xs text-primary/80">Só o que os potes de vida e livre permitem</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{pt.home.buckets}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {buckets.map((bucket) => (
            <div
              key={bucket.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
            >
              <span className="flex items-center gap-3 text-sm font-medium">
                <span aria-hidden>{bucket.icon}</span>
                {bucket.name}
              </span>
              <span className="numeric text-sm text-muted-foreground">
                {formatMoney(bucket.balanceMinor, currency)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{pt.home.monthSummary}</h2>
        <div className="grid grid-cols-3 gap-2">
          <SummaryTile label={pt.home.income} icon={ArrowDownLeft} value={formatMoney(0, currency)} tone="income" />
          <SummaryTile label={pt.home.expenses} icon={ArrowUpRight} value={formatMoney(0, currency)} tone="expense" />
          <SummaryTile label={pt.home.built} icon={Hammer} value={formatMoney(0, currency)} tone="wealth" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Atividade recente</h2>
        <EmptyState
          icon={Receipt}
          title="Ainda não há movimentos"
          description="Regista a tua primeira entrada ou gasto para o sistema começar a distribuir o dinheiro."
          action={
            <Link
              to="/app/transactions"
              className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Registar movimento
            </Link>
          }
        />
      </section>

      {setup.accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sem contas registadas"
          description="Adiciona onde o teu dinheiro existe fisicamente para ver o teu património."
          action={
            <Link
              to="/app/wallets"
              className="inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold"
            >
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
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "income" | "expense" | "wealth";
}) {
  const toneClass =
    tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-wealth";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Icon className={`size-4 ${toneClass}`} />
      <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="numeric mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
