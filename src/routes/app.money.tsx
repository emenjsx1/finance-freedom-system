import { createFileRoute, Link } from "@tanstack/react-router";

import { SectionHeader } from "@/components/design/section-header";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/types";
import { Symbol } from "@/lib/icons/symbols";
import { COMMITMENT_CADENCE_LABELS } from "@/lib/personal/types";

export const Route = createFileRoute("/app/money")({
  head: () => ({
    meta: [
      { title: "O meu dinheiro — Finan." },
      {
        name: "description",
        content: "Onde está o teu dinheiro e para que serve — duas leituras do mesmo dinheiro.",
      },
      { property: "og:title", content: "O meu dinheiro — Finan." },
      { property: "og:description", content: "Total, disponível, reservado, contas e propósitos." },
    ],
  }),
  component: MoneyPage,
});

function MoneyPage() {
  const { setup } = useSetup();
  const { snapshot } = useLedger();
  const { state } = usePersonal();

  const accounts = [...setup.accounts]
    .filter((a) => !a.archived)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const planWallets = snapshot.wallets.filter((w) => !w.archived && w.kind === "goals");
  const reservedMinor = snapshot.wealthMinor - snapshot.spendableMinor;
  const monthlyCommitments = state.commitments
    .filter((c) => c.active && c.cadence === "monthly")
    .reduce((sum, c) => sum + c.amountMinor, 0);

  const empty = accounts.length === 0 && snapshot.wealthMinor === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="O meu dinheiro"
        subtitle="Onde está e para que serve. São o mesmo dinheiro, vistos de dois ângulos."
      />

      {empty ? (
        <section className="card-standard text-center">
          <p className="type-secondary">Ainda não há dinheiro registado.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild>
              <Link to="/app/accounts">Adicionar conta</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/app/plans">Criar um plano</Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="card-hero">
            <p className="type-meta">Total</p>
            <p className="type-hero mt-1">
              <Money minor={snapshot.wealthMinor} options={{ withSymbol: false, compactDecimals: true }} />{" "}
              <span className="type-secondary">{setup.currencyCode}</span>
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="type-meta">Disponível</p>
                <p className="type-section mt-1">
                  <Money minor={snapshot.spendableMinor} options={{ compactDecimals: true }} />
                </p>
              </div>
              <div>
                <p className="type-meta">Reservado</p>
                <p className="type-section mt-1">
                  <Money minor={reservedMinor} options={{ compactDecimals: true }} />
                </p>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader title="Onde está" actionLabel="Contas" to="/app/accounts" />
            <div className="list-group">
              {accounts.map((account) => (
                <Link
                  key={account.id}
                  to="/app/accounts/$accountId"
                  params={{ accountId: account.id }}
                  className="list-row justify-between"
                >
                  <span className="flex items-center gap-3">
                    <span className="icon-tile" aria-hidden>
                      <Symbol name={account.icon} />
                    </span>
                    <span>
                      <span className="block text-sm">{account.name}</span>
                      <span className="type-meta">{ACCOUNT_TYPE_LABELS[account.type]}</span>
                    </span>
                  </span>
                  <Money
                    minor={snapshot.accountBalances[account.id] ?? 0}
                    currency={account.currencyCode ?? setup.currencyCode}
                    options={{ compactDecimals: true }}
                  />
                </Link>
              ))}
              {accounts.length === 0 ? (
                <p className="list-row type-meta">Ainda não registaste contas.</p>
              ) : null}
            </div>
          </section>

          <section>
            <SectionHeader title="Para que serve" actionLabel="Estratégia" to="/app/strategy" />
            <div className="list-group">
              <div className="list-row justify-between">
                <span>Protegido</span>
                <Money minor={snapshot.protectedMinor} options={{ compactDecimals: true }} />
              </div>
              {planWallets.map((wallet) => (
                <div key={wallet.id} className="list-row justify-between">
                  <span className="flex items-center gap-3">
                    <span className="icon-tile" aria-hidden>
                      <Symbol name={wallet.icon} />
                    </span>
                    {wallet.name}
                  </span>
                  <Money minor={wallet.balanceMinor} options={{ compactDecimals: true }} />
                </div>
              ))}
              <div className="list-row justify-between">
                <span>Sem propósito</span>
                <Money minor={snapshot.unallocatedMinor} options={{ compactDecimals: true }} />
              </div>
            </div>
            <p className="type-meta mt-2">
              Esta lista descreve o mesmo dinheiro da lista de cima. Não se somam.
            </p>
          </section>

          <section>
            <SectionHeader title="Compromissos" actionLabel="Ver todos" to="/app/commitments" />
            {state.commitments.filter((c) => c.active).length === 0 ? (
              <p className="card-compact type-meta">
                Ainda não registaste compromissos como renda ou internet.
              </p>
            ) : (
              <div className="list-group">
                {state.commitments
                  .filter((c) => c.active)
                  .slice(0, 5)
                  .map((commitment) => (
                    <div key={commitment.id} className="list-row justify-between">
                      <span>
                        <span className="block text-sm">{commitment.name}</span>
                        <span className="type-meta">
                          {COMMITMENT_CADENCE_LABELS[commitment.cadence]}
                        </span>
                      </span>
                      <Money minor={commitment.amountMinor} options={{ compactDecimals: true }} />
                    </div>
                  ))}
              </div>
            )}
            {monthlyCommitments > 0 ? (
              <p className="type-meta mt-2">
                <Money minor={monthlyCommitments} options={{ compactDecimals: true }} /> esperados por mês.
                Nada é descontado antes de acontecer.
              </p>
            ) : null}
          </section>
        </>
      )}

      <section className="list-group">
        <Link to="/app/activity" className="list-row justify-between">
          <span>Movimentos</span>
          <span className="type-meta">Pesquisa e filtros</span>
        </Link>
        <Link to="/app/money-map" className="list-row justify-between">
          <span>Mapa do dinheiro</span>
          <span className="type-meta">Onde está vs. para que serve</span>
        </Link>
        <Link to="/app/analytics" className="list-row justify-between">
          <span>Análise</span>
          <span className="type-meta">Padrões e categorias</span>
        </Link>
      </section>
    </div>
  );
}
