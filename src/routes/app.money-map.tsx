import { createFileRoute, Link } from "@tanstack/react-router";

import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { organisationRatio } from "@/lib/finance/engine";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/types";

export const Route = createFileRoute("/app/money-map")({
  head: () => ({
    meta: [
      { title: "Mapa do dinheiro — Finance OS" },
      {
        name: "description",
        content: "Onde está o teu dinheiro e para que serve — duas formas de ver exatamente o mesmo dinheiro.",
      },
      { property: "og:title", content: "Mapa do dinheiro — Finance OS" },
      { property: "og:description", content: "Onde está o teu dinheiro e para que serve." },
    ],
  }),
  component: MoneyMapPage,
});

function MoneyMapPage() {
  const { setup } = useSetup();
  const { snapshot } = useLedger();

  const accounts = [...setup.accounts]
    .filter((a) => !a.archived)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const wallets = snapshot.wallets.filter((w) => !w.archived);
  const ratio = organisationRatio(snapshot);

  return (
    <div>
      <PageHeader title="Mapa do dinheiro" subtitle="São duas formas de visualizar o mesmo dinheiro." />

      <section className="rounded-3xl border border-primary/30 bg-primary-soft p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Total</p>
        <Money minor={snapshot.wealthMinor} className="mt-1 block text-4xl font-semibold text-primary" />
        <p className="mt-2 text-xs text-primary/80">
          Este é o teu dinheiro. As duas listas abaixo descrevem-no de ângulos diferentes — não se somam.
        </p>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Onde está</h2>
          <p className="mb-3 text-xs text-muted-foreground">Contas físicas</p>
          <ul className="space-y-2">
            {accounts.map((account) => (
              <li key={account.id}>
                <Link
                  to="/app/accounts/$accountId"
                  params={{ accountId: account.id }}
                  className="flex items-center justify-between rounded-xl px-2 py-2 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden>{account.icon ?? "🏦"}</span>
                    <span>
                      {account.name}
                      <span className="block text-xs text-muted-foreground">
                        {ACCOUNT_TYPE_LABELS[account.type]}
                      </span>
                    </span>
                  </span>
                  <Money
                    minor={snapshot.accountBalances[account.id] ?? 0}
                    currency={account.currencyCode ?? setup.currencyCode}
                    className="font-medium"
                  />
                </Link>
              </li>
            ))}
            {accounts.length === 0 ? (
              <li className="text-sm text-muted-foreground">Ainda não adicionaste contas.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Para que serve</h2>
          <p className="mb-3 text-xs text-muted-foreground">Carteiras de propósito</p>
          <ul className="space-y-2">
            {wallets.map((wallet) => (
              <li key={wallet.id}>
                <Link
                  to="/app/wallets/$walletId"
                  params={{ walletId: wallet.id }}
                  className="flex items-center justify-between rounded-xl px-2 py-2 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden>{wallet.icon}</span>
                    {wallet.name}
                  </span>
                  <Money minor={wallet.balanceMinor} className="font-medium" />
                </Link>
              </li>
            ))}
            {snapshot.unallocatedMinor !== 0 ? (
              <li className="flex items-center justify-between rounded-xl border border-dashed border-border px-2 py-2 text-sm">
                <span className="text-muted-foreground">Por distribuir</span>
                <Money minor={snapshot.unallocatedMinor} className="font-medium text-warning" />
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Organização</h2>
          <span className="text-sm text-muted-foreground">
            {ratio === null ? "—" : `${Math.round(ratio * 100)}% do teu dinheiro tem um propósito.`}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${(ratio ?? 0) * 100}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Total organizado <Money minor={snapshot.purposeTotalMinor} />
          </span>
          <span>
            Protegido <Money minor={snapshot.protectedMinor} />
          </span>
        </div>
        {snapshot.unallocatedMinor > 0 ? (
          <Link
            to="/app/wallets"
            className="mt-4 inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold"
          >
            Organizar restante
          </Link>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Todo o teu dinheiro tem um propósito.</p>
        )}
      </section>

      {snapshot.totalsByCurrency.length > 1 ? (
        <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Moedas</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {snapshot.totalsByCurrency.map((total) => (
              <li key={total.currencyCode} className="flex items-center justify-between">
                <Money minor={total.totalMinor} currency={total.currencyCode} />
                <span className="text-xs text-muted-foreground">
                  {total.convertedMinor === null ? (
                    "sem taxa de câmbio"
                  ) : (
                    <>
                      ≈ <Money minor={total.convertedMinor} /> (taxa manual)
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Moedas diferentes nunca são somadas sem uma taxa que tenhas indicado.
          </p>
        </section>
      ) : null}
    </div>
  );
}
