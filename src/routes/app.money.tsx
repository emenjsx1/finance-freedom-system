import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { SectionHeader } from "@/components/design/section-header";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { WalletForm } from "@/components/wallets/wallet-form";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import { financialPosition } from "@/lib/finance/position";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/types";
import { Symbol } from "@/lib/icons/symbols";
import { COMMITMENT_CADENCE_LABELS } from "@/lib/personal/types";

export const Route = createFileRoute("/app/money")({
  head: () => ({
    meta: [
      { title: "O meu dinheiro — Norte" },
      {
        name: "description",
        content: "Onde está o teu dinheiro e para que serve — duas leituras do mesmo dinheiro.",
      },
      { property: "og:title", content: "O meu dinheiro — Norte" },
      { property: "og:description", content: "Total, disponível, reservado, contas e propósitos." },
    ],
  }),
  component: MoneyPage,
});

function MoneyPage() {
  const { setup } = useSetup();
  const { snapshot } = useLedger();
  const { state } = usePersonal();
  const [purposeOpen, setPurposeOpen] = useState(false);

  const accounts = [...setup.accounts]
    .filter((a) => !a.archived)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const purposes = snapshot.wallets.filter((wallet) => !wallet.archived);
  const position = financialPosition(snapshot);
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
                  <Money minor={position.availableMinor} options={{ compactDecimals: true }} />
                </p>
              </div>
              <div>
                <p className="type-meta">Reservado</p>
                <p className="type-section mt-1">
                  <Money minor={position.reservedMinor} options={{ compactDecimals: true }} />
                </p>
              </div>
            </div>
          </section>

          <section className="list-group">
            <div className="list-row justify-between">
              <span className="type-meta">Livre após compromissos</span>
              <Money
                minor={position.availableMinor - monthlyCommitments}
                className="font-medium"
              />
            </div>
            <Link to="/app/networth" className="list-row justify-between">
              <span>Património</span>
              <span className="type-meta">Dinheiro, bens e dívidas</span>
            </Link>
          </section>

          <section className="card-standard">
            <h2 className="text-base font-semibold">Ajuda-me a organizar</h2>
            <p className="mt-1 type-secondary">
              Responde a algumas perguntas e vê formas de organizar o teu dinheiro.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/app/organize">Começar</Link>
            </Button>
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
            <SectionHeader title="Para quê?" />
            <div className="list-group">
              {purposes.map((wallet) => (
                <Link
                  key={wallet.id}
                  to="/app/wallets/$walletId"
                  params={{ walletId: wallet.id }}
                  className="list-row justify-between"
                >
                  <span className="flex items-center gap-3">
                    <span className="icon-tile" aria-hidden>
                      <Symbol name={wallet.icon} />
                    </span>
                    {wallet.name}
                  </span>
                  <Money minor={wallet.balanceMinor} options={{ compactDecimals: true }} />
                </Link>
              ))}
              <div className="list-row justify-between">
                <span>Sem propósito</span>
                <Money minor={position.availableMinor} options={{ compactDecimals: true }} />
              </div>
            </div>
            <Button variant="outline" className="mt-3 w-full" onClick={() => setPurposeOpen(true)}>
              <Plus className="size-4" />
              Criar propósito
            </Button>
            <p className="type-meta mt-2">
              Cada valor reservado continua na respetiva conta. Esta lista não se soma ao total.
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
      <WalletForm open={purposeOpen} onOpenChange={setPurposeOpen} />
    </div>
  );
}
