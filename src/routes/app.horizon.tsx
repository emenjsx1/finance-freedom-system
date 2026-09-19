import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { buildHorizon, type HorizonGoal } from "@/lib/planning/engine";

export const Route = createFileRoute("/app/horizon")({
  head: () => ({
    meta: [
      { title: "Próximos 12 meses — Norte" },
      {
        name: "description",
        content: "As tuas metas dos próximos 12 meses: quanto custam, quanto já está guardado e quanto falta proteger.",
      },
      { property: "og:title", content: "Próximos 12 meses — Norte" },
      { property: "og:description", content: "Metas, custos e quanto falta proteger para cada uma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HorizonPage,
});

function GoalCard({ goal }: { goal: HorizonGoal }) {
  const date = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
    : null;
  return (
    <Link
      to="/app/plans/$planId"
      params={{ planId: goal.planId }}
      className="card-compact block"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{goal.name}</p>
          <p className="type-meta mt-1">
            {date ? `Para ${date}` : "Sem data definida"}
            {goal.monthsLeft !== null ? ` · ${Math.max(0, goal.monthsLeft)} meses` : ""}
          </p>
        </div>
        <p className="shrink-0 text-sm"><Money minor={goal.costMinor} /></p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(goal.progress * 100)}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="type-meta">Já guardado</dt>
          <dd><Money minor={goal.reservedMinor} /></dd>
        </div>
        <div>
          <dt className="type-meta">Falta proteger</dt>
          <dd><Money minor={goal.toProtectMinor} /></dd>
        </div>
        {goal.monthlyNeededMinor !== null && goal.toProtectMinor > 0 ? (
          <div className="col-span-2">
            <dt className="type-meta">Por mês até lá</dt>
            <dd><Money minor={goal.monthlyNeededMinor} /></dd>
          </div>
        ) : null}
      </dl>
    </Link>
  );
}

function HorizonPage() {
  const { state } = usePersonal();
  const { snapshot } = useLedger();

  const horizon = useMemo(
    () => buildHorizon({ plans: state.plans, reservedByPurpose: snapshot.bucketBalances }),
    [state.plans, snapshot.bucketBalances],
  );

  const empty =
    horizon.withinYear.length === 0 && horizon.undated.length === 0 && horizon.later.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Próximos 12 meses"
        subtitle="O que queres alcançar, quanto custa e quanto falta proteger para cada meta."
      />

      {empty ? (
        <section className="card-standard text-center">
          <p className="type-secondary">
            Ainda não tens metas com custo definido. Cria um plano e diz quanto custa e para quando.
          </p>
          <Button asChild className="mt-4"><Link to="/app/plans">Ver os meus planos</Link></Button>
        </section>
      ) : (
        <>
          <section className="card-standard">
            <h2 className="type-section">Onde estás</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="type-secondary">Custo total das metas</dt>
                <dd><Money minor={horizon.totalCostMinor} /></dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="type-secondary">Já guardado</dt>
                <dd><Money minor={horizon.totalReservedMinor} /></dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="type-secondary">Falta proteger</dt>
                <dd><Money minor={horizon.totalToProtectMinor} /></dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                <dt className="font-medium">Por mês, nas metas deste ano</dt>
                <dd className="font-medium"><Money minor={horizon.monthlyNeededMinor} /></dd>
              </div>
            </dl>
            <p className="type-meta mt-4">
              Estes valores vêm dos custos e datas que escreveste. Nada é estimado pelo sistema.
            </p>
          </section>

          {horizon.withinYear.length > 0 ? (
            <section className="space-y-3">
              <h2 className="type-section">Nos próximos 12 meses</h2>
              {horizon.withinYear.map((goal) => <GoalCard key={goal.planId} goal={goal} />)}
            </section>
          ) : null}

          {horizon.undated.length > 0 ? (
            <section className="space-y-3">
              <h2 className="type-section">Sem data ainda</h2>
              {horizon.undated.map((goal) => <GoalCard key={goal.planId} goal={goal} />)}
            </section>
          ) : null}

          {horizon.later.length > 0 ? (
            <section className="space-y-3">
              <h2 className="type-section">Mais tarde</h2>
              {horizon.later.map((goal) => <GoalCard key={goal.planId} goal={goal} />)}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
