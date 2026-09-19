import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { SectionHeader } from "@/components/design/section-header";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
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
