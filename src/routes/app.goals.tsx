import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { GoalCard } from "@/components/design/goal-card";
import { ProgressIndicator } from "@/components/design/progress-indicator";
import { SectionHeader } from "@/components/design/section-header";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";

export const Route = createFileRoute("/app/goals")({
  head: () => ({
    meta: [
      { title: "Os teus planos — Finance OS" },
      { name: "description", content: "Define objetivos e acompanha quanto já construíste para cada um." },
      { property: "og:title", content: "Os teus planos — Finance OS" },
      { property: "og:description", content: "Define objetivos e acompanha o teu progresso." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { setup } = useSetup();
  const { snapshot } = useLedger();

  const goals = snapshot.wallets
    .filter((wallet) => wallet.kind === "goals" && !wallet.archived)
    .map((wallet) => {
      const item = setup.ruleItems.find((rule) => rule.id === wallet.id);
      return {
        wallet,
        targetMinor: item?.targetMinor,
        targetDate: item?.targetDate,
        coverImageUrl: item?.coverImageUrl,
        ratio: item?.targetMinor ? wallet.balanceMinor / item.targetMinor : 0,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);

  const featured = goals[0];
  const rest = goals.slice(1);

  return (
    <div>
      <PageHeader title="Os teus planos." subtitle="Aquilo que estás a construir, com data e valor." />

      {!featured ? (
        <EmptyState
          icon={Target}
          title="Ainda sem objetivos"
          description="Cria um pote de objetivos na tua organização para dar destino ao dinheiro que guardas."
          action={
            <Button asChild>
              <a href="/app/wallets">Criar objetivo</a>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          <section className="card-hero">
            <p className="type-caption">Objetivo em destaque</p>
            <h2 className="type-heading mt-2">{featured.wallet.name}</h2>
            <p className="mt-3 flex items-baseline gap-2">
              <Money
                minor={featured.wallet.balanceMinor}
                options={{ withSymbol: false, compactDecimals: true }}
                className="type-display"
              />
              <span className="type-caption">{setup.currencyCode}</span>
            </p>
            {featured.targetMinor ? (
              <>
                <p className="type-secondary mt-1">
                  de <Money minor={featured.targetMinor} options={{ withSymbol: false, compactDecimals: true }} />{" "}
                  {setup.currencyCode}
                  {featured.targetDate
                    ? ` · até ${new Date(featured.targetDate).toLocaleDateString("pt-PT")}`
                    : ""}
                </p>
                <div className="mt-5">
                  <ProgressIndicator value={featured.ratio} label={`Progresso de ${featured.wallet.name}`} />
                  <p className="type-meta mt-2">
                    {Math.round(Math.min(1, Math.max(0, featured.ratio)) * 100)}% construído
                  </p>
                </div>
              </>
            ) : (
              <p className="type-secondary mt-1">Sem meta definida.</p>
            )}
          </section>

          {rest.length > 0 ? (
            <section className="space-y-3">
              <SectionHeader title="Outros planos" />
              {rest.map((goal) => (
                <GoalCard
                  key={goal.wallet.id}
                  name={goal.wallet.name}
                  balanceMinor={goal.wallet.balanceMinor}
                  targetMinor={goal.targetMinor}
                  targetDate={goal.targetDate}
                  coverImageUrl={goal.coverImageUrl}
                  icon={goal.wallet.icon}
                  to={{ to: "/app/wallets/$walletId", params: { walletId: goal.wallet.id } }}
                />
              ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
