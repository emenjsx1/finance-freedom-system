import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { SectionHeader } from "@/components/design/section-header";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { developmentReviewFacts } from "@/lib/development/engine";
import { EVOLUTION_KIND_LABELS } from "@/lib/development/types";
import { goalPace } from "@/lib/personal/engine";

export const Route = createFileRoute("/app/review")({
  head: () => ({
    meta: [
      { title: "Revisão — Finan." },
      { name: "description", content: "Um olhar calmo sobre o mês, sem notas nem pontuações." },
      { property: "og:title", content: "Revisão — Finan." },
      { property: "og:description", content: "O que aconteceu e o que ainda faz sentido." },
    ],
  }),
  component: ReviewPage,
});

/** Money in and out over a window, straight from recorded movements. */
function windowTotals(transactions: { kind: string; amountMinor: number; occurredAt: string }[], fromMs: number) {
  let income = 0;
  let expenses = 0;
  for (const tx of transactions) {
    if (new Date(tx.occurredAt).getTime() < fromMs) continue;
    if (tx.kind === "income") income += tx.amountMinor;
    if (tx.kind === "expense") expenses += tx.amountMinor;
  }
  return { income, expenses };
}

function ReviewPage() {
  const { state, updatePlan, updateContext } = usePersonal();
  const { snapshot, ledger } = useLedger();
  const [period, setPeriod] = useState<"week" | "month">("week");

  const totals = useMemo(() => {
    const now = new Date();
    const from =
      period === "week"
        ? Date.now() - 1000 * 60 * 60 * 24 * 7
        : new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return windowTotals(ledger.transactions, from);
  }, [ledger.transactions, period]);

  const upcoming = state.commitments.filter((c) => c.active);

  /** The same window, applied to the person's own work. Facts only. */
  const devFacts = useMemo(() => {
    const now = new Date();
    const fromISO = new Date(
      period === "week"
        ? Date.now() - 1000 * 60 * 60 * 24 * 7
        : new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    ).toISOString();
    return developmentReviewFacts(
      {
        actions: state.development.actions,
        programs: state.development.programs,
        decisions: state.development.decisions,
        evolution: state.development.evolution,
      },
      fromISO,
      now.toISOString(),
    );
  }, [period, state.development]);

  const savedFor = (walletId?: string) =>
    walletId ? (snapshot.wallets.find((w) => w.id === walletId)?.balanceMinor ?? 0) : 0;

  /** Context that has not been confirmed for six months is worth revisiting. */
  const stale = useMemo(() => {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 180;
    return state.context.filter(
      (item) =>
        item.state === "active" &&
        new Date(item.reviewedAt ?? item.createdAt).getTime() < cutoff,
    );
  }, [state.context]);

  const idlePlans = state.plans.filter(
    (plan) =>
      plan.status === "active" &&
      Date.now() - new Date(plan.updatedAt).getTime() > 1000 * 60 * 60 * 24 * 90,
  );

  const progressing = state.plans
    .filter((plan) => plan.status === "active" && plan.financial)
    .map((plan) => ({ plan, pace: goalPace(plan, savedFor(plan.walletId)) }))
    .filter((item) => item.pace && item.pace.savedMinor > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Revisão"
        subtitle="Sem notas, sem pontuações, sem julgamento. Só o que aconteceu."
      />

      <div className="flex gap-2" role="tablist" aria-label="Período da revisão">
        {(["week", "month"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={period === id}
            onClick={() => setPeriod(id)}
            className={
              period === id
                ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                : "rounded-full bg-subtle px-4 py-2 text-sm font-medium text-muted-foreground"
            }
          >
            {id === "week" ? "Semana" : "Mês"}
          </button>
        ))}
      </div>

      <section className="card-standard grid grid-cols-2 gap-5">
        <div>
          <p className="type-meta">Entrou</p>
          <p className="type-section mt-1">
            <Money minor={totals.income} options={{ compactDecimals: true }} />
          </p>
        </div>
        <div>
          <p className="type-meta">Saiu</p>
          <p className="type-section mt-1">
            <Money minor={totals.expenses} options={{ compactDecimals: true }} />
          </p>
        </div>
        <div>
          <p className="type-meta">Reservado hoje</p>
          <p className="type-section mt-1">
            <Money
              minor={snapshot.wealthMinor - snapshot.spendableMinor}
              options={{ compactDecimals: true }}
            />
          </p>
        </div>
        <div>
          <p className="type-meta">Compromissos ativos</p>
          <p className="type-section mt-1">{upcoming.length}</p>
        </div>
      </section>

      <section>
        <SectionHeader title="O que fizeste" actionLabel="Desenvolvimento" to="/app/development" />
        <div className="list-group">
          <div className="list-row justify-between">
            <span className="text-sm">Ações concluídas</span>
            <span className="type-meta">{devFacts.actionsCompleted}</span>
          </div>
          <div className="list-row justify-between">
            <span className="text-sm">Ações por fazer</span>
            <span className="type-meta">{devFacts.actionsPending}</span>
          </div>
          <div className="list-row justify-between">
            <span className="text-sm">Programas a decorrer</span>
            <span className="type-meta">{devFacts.programsActive}</span>
          </div>
          <div className="list-row justify-between">
            <span className="text-sm">Decisões registadas</span>
            <span className="type-meta">{devFacts.decisionsRecorded}</span>
          </div>
        </div>
      </section>

      {devFacts.changes.length ? (
        <section>
          <SectionHeader title="O que mudou" actionLabel="Evolução" to="/app/development/evolution" />
          <div className="list-group">
            {devFacts.changes.slice(0, 6).map((event) => (
              <div key={event.id} className="list-row justify-between">
                <span className="text-sm">{event.title}</span>
                <span className="type-meta">{EVOLUTION_KIND_LABELS[event.kind]}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {progressing.length ? (
        <section>
          <SectionHeader title="O que ganhou forma" />
          <div className="list-group">
            {progressing.map(({ plan, pace }) => (
              <div key={plan.id} className="list-row justify-between">
                <span className="text-sm">{plan.name}</span>
                <span className="type-meta">
                  <Money minor={pace!.savedMinor} options={{ compactDecimals: true }} /> guardados
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="card-standard type-secondary">
          Este período foi mais calmo. Também faz parte.
        </p>
      )}

      {idlePlans.length ? (
        <section>
          <SectionHeader title="Planos parados há algum tempo" />
          <div className="space-y-3">
            {idlePlans.map((plan) => (
              <div key={plan.id} className="card-compact">
                <p className="text-sm font-medium">{plan.name}</p>
                <p className="type-meta mt-1">Sem alterações nos últimos meses. Ainda o queres?</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => updatePlan(plan.id, {})}>
                    Continua a fazer sentido
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updatePlan(plan.id, { status: "paused" })}
                  >
                    Pôr em pausa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {stale.length ? (
        <section>
          <SectionHeader title="Isto ainda é verdade?" />
          <div className="space-y-3">
            {stale.map((item) => (
              <div key={item.id} className="card-compact">
                <p className="text-sm">{item.content}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      updateContext(item.id, { reviewedAt: new Date().toISOString(), state: "active" })
                    }
                  >
                    Sim
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateContext(item.id, { state: "outdated" })}
                  >
                    Já mudou
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Button variant="secondary" asChild>
        <Link to="/app/me">Voltar ao meu espaço</Link>
      </Button>
    </div>
  );
}
