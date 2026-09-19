import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Pencil } from "lucide-react";

import { NativeSheet } from "@/components/design/native-sheet";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { AmountInput } from "@/components/transactions/amount-input";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import { financialPosition } from "@/lib/finance/position";
import { buildMonthlyPlan } from "@/lib/planning/engine";

export const Route = createFileRoute("/app/planning")({
  head: () => ({
    meta: [
      { title: "Planeamento do mês — Norte" },
      {
        name: "description",
        content: "Custos mensais, quanto vais pôr em cada propósito e um aviso antes de o disponível chegar a zero.",
      },
      { property: "og:title", content: "Planeamento do mês — Norte" },
      { property: "og:description", content: "O que o teu mês custa e até onde chega o dinheiro disponível." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanningPage,
});

function PlanningPage() {
  const { setup, update } = useSetup();
  const { ledger, snapshot } = useLedger();
  const { state } = usePersonal();
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [draftMinor, setDraftMinor] = useState(0);

  const position = financialPosition(snapshot);

  const plan = useMemo(
    () =>
      buildMonthlyPlan({
        commitments: state.commitments,
        recurring: ledger.recurring,
        purposes: setup.ruleItems,
        reservedByPurpose: snapshot.bucketBalances,
        availableMinor: position.availableMinor,
      }),
    [state.commitments, ledger.recurring, setup.ruleItems, snapshot.bucketBalances, position.availableMinor],
  );

  function savePlanned() {
    if (!editing) return;
    const id = editing.id;
    update({
      ruleItems: setup.ruleItems.map((item) =>
        item.id === id ? { ...item, monthlyPlanMinor: draftMinor > 0 ? draftMinor : undefined } : item,
      ),
    });
    setEditing(null);
  }

  const zeroDate = plan.zeroDateISO
    ? new Date(plan.zeroDateISO).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Planeamento do mês"
        subtitle="O que o mês custa, quanto queres pôr em cada propósito e até onde chega o disponível."
      />

      {plan.alert !== "none" ? (
        <section
          className={
            plan.alert === "zero"
              ? "card-standard border-destructive/40 bg-destructive/5"
              : "card-standard border-amber-500/40 bg-amber-500/5"
          }
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="text-sm font-medium">
                {plan.alert === "zero"
                  ? "O plano deste mês não cabe no dinheiro disponível."
                  : "O disponível chega a zero em menos de dois meses."}
              </p>
              <p className="type-secondary mt-1">
                {plan.alert === "zero" ? (
                  <>
                    Planeaste <Money minor={plan.outflowMinor} /> e tens <Money minor={plan.availableMinor} />{" "}
                    disponível. Faltam <Money minor={Math.abs(plan.leftoverMinor)} />.
                  </>
                ) : (
                  <>Ao ritmo atual, o disponível chega a zero a {zeroDate}.</>
                )}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card-standard">
        <h2 className="type-section">Resumo do mês</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-secondary">Custos mensais</dt>
            <dd><Money minor={plan.costsTotalMinor} /></dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-secondary">Para propósitos</dt>
            <dd><Money minor={plan.purposesTotalMinor} /></dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <dt className="font-medium">Total planeado</dt>
            <dd className="font-medium"><Money minor={plan.outflowMinor} /></dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-secondary">Disponível agora</dt>
            <dd><Money minor={plan.availableMinor} /></dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-secondary">Sobra depois do plano</dt>
            <dd className={plan.leftoverMinor < 0 ? "text-destructive" : undefined}>
              <Money minor={plan.leftoverMinor} />
            </dd>
          </div>
          {zeroDate ? (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="type-secondary">Disponível chega a zero</dt>
              <dd>{zeroDate}</dd>
            </div>
          ) : null}
        </dl>
        <p className="type-meta mt-4">
          Nada aqui move dinheiro. É só o retrato do que escreveste.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="type-section">Custos mensais</h2>
        {plan.costs.length === 0 ? (
          <div className="card-standard text-center">
            <p className="type-secondary">
              Ainda não tens compromissos nem despesas recorrentes registados.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm"><Link to="/app/commitments">Compromissos</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link to="/app/recurring">Recorrentes</Link></Button>
            </div>
          </div>
        ) : (
          plan.costs.map((cost) => (
            <div key={cost.id} className="card-compact flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{cost.name}</p>
                <p className="type-meta mt-1">
                  {cost.detail} · {cost.source === "commitment" ? "Compromisso" : "Recorrente"}
                </p>
              </div>
              <p className="shrink-0 text-sm"><Money minor={cost.amountMinor} /></p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="type-section">Quanto vou pôr em cada propósito</h2>
        {plan.purposes.length === 0 ? (
          <div className="card-standard text-center">
            <p className="type-secondary">Ainda não tens propósitos criados.</p>
            <Button asChild className="mt-4" size="sm"><Link to="/app/wallets">Ver propósitos</Link></Button>
          </div>
        ) : (
          plan.purposes.map((purpose) => (
            <div key={purpose.id} className="card-compact flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{purpose.name}</p>
                <p className="type-meta mt-1">
                  Guardado: <Money minor={purpose.reservedMinor} />
                  {purpose.targetMinor ? <> de <Money minor={purpose.targetMinor} /></> : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-sm">
                  {purpose.plannedMinor > 0 ? <Money minor={purpose.plannedMinor} /> : <span className="type-meta">sem plano</span>}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Definir valor mensal de ${purpose.name}`}
                  onClick={() => {
                    setDraftMinor(purpose.plannedMinor);
                    setEditing({ id: purpose.id, name: purpose.name });
                  }}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      <NativeSheet
        open={editing !== null}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        title={editing ? `Quanto por mês para ${editing.name}?` : ""}
      >
        <div className="space-y-5">
          <AmountInput
            valueMinor={draftMinor}
            onChange={setDraftMinor}
            currencyCode={setup.currencyCode}
            label="Valor por mês"
            autoFocus
          />
          <p className="type-meta">
            Isto é só o teu plano. O dinheiro só sai de disponível quando guardares.
          </p>
          <Button className="w-full" onClick={savePlanned}>Guardar plano</Button>
        </div>
      </NativeSheet>
    </div>
  );
}
