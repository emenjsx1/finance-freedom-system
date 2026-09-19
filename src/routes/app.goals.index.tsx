import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Target } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { GoalCard } from "@/components/design/goal-card";
import { GoalCreateSheet } from "@/components/goals/goal-create-sheet";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { symbolLabel } from "@/lib/icons/symbols";

export const Route = createFileRoute("/app/goals/")({
  head: () => ({
    meta: [
      { title: "Os teus planos — Norte" },
      { name: "description", content: "Define objetivos e acompanha quanto já construíste para cada um." },
      { property: "og:title", content: "Os teus planos — Norte" },
      { property: "og:description", content: "Define objetivos e acompanha o teu progresso." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { setup } = useSetup();
  const { snapshot } = useLedger();
  const [createOpen, setCreateOpen] = useState(false);

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

  return (
    <div>
      <PageHeader title="Os teus planos." subtitle="Aquilo que estás a construir, com data e valor." />

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Ainda sem objetivos"
          description="Cria o primeiro objetivo e dá destino ao dinheiro que guardas."
          action={<Button onClick={() => setCreateOpen(true)}>Criar objetivo</Button>}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.wallet.id}
              name={goal.wallet.name}
              balanceMinor={goal.wallet.balanceMinor}
              targetMinor={goal.targetMinor}
              targetDate={goal.targetDate}
              coverImageUrl={goal.coverImageUrl}
              icon={goal.wallet.icon}
              kindLabel={symbolLabel(goal.wallet.icon)}
              to={{ to: "/app/goals/$goalId", params: { goalId: goal.wallet.id } }}
            />
          ))}

          <Button variant="outline" className="w-full" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Novo objetivo
          </Button>
        </div>
      )}

      <GoalCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
