import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Pencil, Plus } from "lucide-react";

import { NativeSheet } from "@/components/design/native-sheet";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { AmountInput } from "@/components/transactions/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import { financialPosition } from "@/lib/finance/position";
import { buildMonthlyPlan, type MonthlyCostLine } from "@/lib/planning/engine";

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
  const { ledger, snapshot, upsertRecurring } = useLedger();
  const { state, updateCommitment, addCommitment } = usePersonal();
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [draftMinor, setDraftMinor] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [costName, setCostName] = useState("");
  const [costMinor, setCostMinor] = useState(0);
  const [costDay, setCostDay] = useState("1");

  function saveCost() {
    addCommitment({
      name: costName.trim(),
      amountMinor: costMinor,
      cadence: "monthly",
      active: true,
      dueDay: Number(costDay) || 1,
    });
    setAddOpen(false);
    setCostName("");
    setCostMinor(0);
    setCostDay("1");
  }

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

  const monthLabel = new Date().toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  function togglePaid(cost: MonthlyCostLine) {
    const key = plan.monthKey;
    const next = (list: string[] | undefined) =>
      cost.paid ? (list ?? []).filter((m) => m !== key) : [...(list ?? []), key];

    if (cost.source === "commitment") {
      const commitment = state.commitments.find((c) => c.id === cost.sourceId);
      if (!commitment) return;
      updateCommitment(commitment.id, { paidMonths: next(commitment.paidMonths) });
      return;
    }
    const rule = ledger.recurring.find((r) => r.id === cost.sourceId);
    if (!rule) return;
    upsertRecurring({ ...rule, paidMonths: next(rule.paidMonths) });
  }

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
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="type-section">Gastos mensais</h2>
          <p className="type-meta">{monthLabel}</p>
        </div>
        <Button size="sm" className="w-full" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Adicionar gasto mensal
        </Button>
        {plan.costs.length === 0 ? (
          <div className="card-standard text-center">
            <p className="type-secondary">
              Escreve aqui os teus gastos de todos os meses — renda, internet, escola. Depois é só
              marcar cada um como pago.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm" variant="secondary"><Link to="/app/commitments">Ver compromissos</Link></Button>
              <Button asChild size="sm" variant="secondary"><Link to="/app/recurring">Recorrentes</Link></Button>
            </div>
          </div>
        ) : (
          <>
            <div className="card-compact flex items-baseline justify-between gap-4">
              <p className="type-secondary text-sm">Já pago este mês</p>
              <p className="text-sm font-medium"><Money minor={plan.costsPaidMinor} /></p>
            </div>
            <div className="card-compact flex items-baseline justify-between gap-4">
              <p className="type-secondary text-sm">Falta pagar</p>
              <p className="text-sm font-medium"><Money minor={plan.costsUnpaidMinor} /></p>
            </div>
            {plan.costs.map((cost) => (
              <div key={cost.id} className="card-compact flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${cost.paid ? "text-muted-foreground line-through" : ""}`}>
                    {cost.name}
                  </p>
                  <p className="type-meta mt-1">
                    {cost.detail} · {cost.source === "commitment" ? "Compromisso" : "Recorrente"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm"><Money minor={cost.amountMinor} /></p>
                  <Button
                    variant={cost.paid ? "secondary" : "outline"}
                    size="sm"
                    className="min-h-11"
                    aria-label={cost.paid ? `Desmarcar ${cost.name} como pago` : `Marcar ${cost.name} como pago`}
                    onClick={() => togglePaid(cost)}
                  >
                    {cost.paid ? <Check className="size-4" aria-hidden /> : null}
                    {cost.paid ? "Pago" : "Marcar pago"}
                  </Button>
                </div>
              </div>
            ))}
            <p className="type-meta">
              Marcar como pago não mexe em dinheiro. A cada mês novo, tudo volta a aparecer por pagar.
            </p>
          </>
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

      <NativeSheet open={addOpen} onOpenChange={setAddOpen} title="Novo gasto mensal">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="cost-name">O que é</Label>
            <Input
              id="cost-name"
              value={costName}
              autoFocus
              onChange={(e) => setCostName(e.target.value)}
              placeholder="Renda, internet, escola…"
            />
          </div>
          <AmountInput
            valueMinor={costMinor}
            onChange={setCostMinor}
            currencyCode={setup.currencyCode}
            label="Quanto por mês"
          />
          <div className="space-y-2">
            <Label htmlFor="cost-day">Dia do mês</Label>
            <Input
              id="cost-day"
              type="number"
              min={1}
              max={31}
              value={costDay}
              onChange={(e) => setCostDay(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!costName.trim() || costMinor <= 0}
            onClick={saveCost}
          >
            Guardar gasto mensal
          </Button>
          <p className="type-meta">
            Não sai dinheiro nenhum. Aparece na lista e marcas como pago quando pagares.
          </p>
        </div>
      </NativeSheet>
    </div>
  );
}
