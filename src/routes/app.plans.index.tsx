import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PlanCard } from "@/components/personal/plan-card";
import { PlanCreateSheet } from "@/components/personal/plan-create-sheet";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { PLAN_STATUS_LABELS, type PlanStatus } from "@/lib/personal/types";

const ORDER: PlanStatus[] = ["active", "idea", "paused", "completed", "archived"];

export const Route = createFileRoute("/app/plans/")({
  head: () => ({
    meta: [
      { title: "Planos — Finan." },
      { name: "description", content: "O que estás a construir, a preparar ou apenas a pensar." },
      { property: "og:title", content: "Planos — Finan." },
      { property: "og:description", content: "Viagens, compras, mudanças e ideias, com ou sem dinheiro." },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { state } = usePersonal();
  const { snapshot } = useLedger();
  const [creating, setCreating] = useState(false);

  const savedFor = useMemo(
    () => (walletId?: string) =>
      walletId ? (snapshot.wallets.find((w) => w.id === walletId)?.balanceMinor ?? 0) : 0,
    [snapshot.wallets],
  );

  const groups = ORDER.map((status) => ({
    status,
    plans: state.plans.filter((p) => p.status === status),
  })).filter((group) => group.plans.length > 0);

  return (
    <div>
      <PageHeader
        title="Planos"
        subtitle="O que queres construir, mudar ou experimentar."
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            Criar plano
          </Button>
        }
      />

      {state.plans.length === 0 ? (
        <section className="card-standard text-center">
          <h2 className="type-section">Há algo que queres construir?</h2>
          <p className="type-secondary mt-2">
            Pode ser uma viagem, uma compra, uma mudança ou simplesmente uma ideia.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => setCreating(true)}>Criar plano</Button>
            <Button variant="secondary" asChild>
              <Link to="/app/agent">Falar com o Agente</Link>
            </Button>
          </div>
        </section>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.status}>
              <h2 className="type-section mb-3">{PLAN_STATUS_LABELS[group.status]}</h2>
              <div className="space-y-3">
                {group.plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} savedMinor={savedFor(plan.walletId)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PlanCreateSheet open={creating} onOpenChange={setCreating} />
    </div>
  );
}
