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

  const [tab, setTab] = useState<"active" | "idea" | "completed">("active");

  const TABS: { id: typeof tab; label: string; statuses: PlanStatus[] }[] = [
    { id: "active", label: "Ativos", statuses: ["active", "paused"] },
    { id: "idea", label: "Ideias", statuses: ["idea"] },
    { id: "completed", label: "Concluídos", statuses: ["completed", "archived"] },
  ];

  const current = TABS.find((t) => t.id === tab)!;
  const groups = ORDER.filter((status) => current.statuses.includes(status))
    .map((status) => ({ status, plans: state.plans.filter((p) => p.status === status) }))
    .filter((group) => group.plans.length > 0);

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
          <div className="flex gap-2" role="tablist" aria-label="Filtrar planos">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={
                  tab === item.id
                    ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    : "rounded-full bg-subtle px-4 py-2 text-sm font-medium text-muted-foreground"
                }
              >
                {item.label}
              </button>
            ))}
          </div>

          {groups.length === 0 ? (
            <p className="card-standard type-secondary text-center">
              Nada nesta lista por agora.
            </p>
          ) : null}

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
