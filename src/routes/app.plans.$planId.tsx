import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ProgressIndicator } from "@/components/design/progress-indicator";
import { PlanFundingSheet } from "@/components/personal/plan-funding-sheet";
import { SectionHeader } from "@/components/design/section-header";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import { Symbol } from "@/lib/icons/symbols";
import { goalPace } from "@/lib/personal/engine";
import {
  FUNDING_STRATEGY_LABELS,
  PLAN_PRIORITY_LABELS,
  PLAN_STATUS_LABELS,
  PLAN_TYPE_LABELS,
  PLAN_TYPE_SYMBOL,
  type FundingStrategy,
  type PlanPriority,
  type PlanStatus,
} from "@/lib/personal/types";

export const Route = createFileRoute("/app/plans/$planId")({
  head: () => ({
    meta: [
      { title: "Plano — Norte" },
      { name: "description", content: "O plano, o progresso e o que falta decidir." },
      { property: "og:title", content: "Plano — Norte" },
      { property: "og:description", content: "Progresso, passos e dinheiro reservado para este plano." },
    ],
  }),
  component: PlanDetailPage,
});

function PlanDetailPage() {
  const { planId } = Route.useParams();
  const navigate = useNavigate();
  const { state, updatePlan, removePlan, addMilestone, toggleMilestone } = usePersonal();
  const { snapshot, ledger } = useLedger();
  const { setup } = useSetup();
  const [milestone, setMilestone] = useState("");
  const [funding, setFunding] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const plan = state.plans.find((p) => p.id === planId);

  const savedMinor = useMemo(
    () => (plan?.walletId ? (snapshot.wallets.find((w) => w.id === plan.walletId)?.balanceMinor ?? 0) : 0),
    [plan?.walletId, snapshot.wallets],
  );

  if (!plan) {
    return (
      <div className="card-standard text-center">
        <p className="type-secondary">Este plano já não existe.</p>
        <Button variant="secondary" className="mt-4" asChild>
          <Link to="/app/plans">Voltar aos planos</Link>
        </Button>
      </div>
    );
  }

  const pace = goalPace(plan, savedMinor);

  /**
   * Where the reserved money physically sits, read from the reservations that
   * recorded a source account. Reserving never moved the money.
   */
  const sources = plan.walletId
    ? Object.entries(
        ledger.transactions
          .filter((tx) => tx.kind === "reallocation" && tx.toBucketId === plan.walletId && tx.accountId)
          .reduce<Record<string, number>>((acc, tx) => {
            acc[tx.accountId!] = (acc[tx.accountId!] ?? 0) + tx.amountMinor;
            return acc;
          }, {}),
      ).map(([accountId, amountMinor]) => ({
        accountId,
        amountMinor,
        name: setup.accounts.find((a) => a.id === accountId)?.name ?? "Conta",
      }))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-3" asChild>
          <Link to="/app/plans">
            <ArrowLeft className="size-4" aria-hidden />
            Planos
          </Link>
        </Button>

        {plan.coverImageUrl ? (
          <img src={plan.coverImageUrl} alt="" className="mb-4 h-40 w-full rounded-2xl object-cover" />
        ) : null}

        <div className="flex items-center gap-3">
          <span className="icon-tile" aria-hidden>
            <Symbol name={plan.symbol ?? PLAN_TYPE_SYMBOL[plan.type]} />
          </span>
          <div className="min-w-0">
            <h1 className="type-title truncate">{plan.name}</h1>
            <p className="type-meta">
              {PLAN_TYPE_LABELS[plan.type]} · {PLAN_STATUS_LABELS[plan.status]} ·{" "}
              {PLAN_PRIORITY_LABELS[plan.priority]}
            </p>
          </div>
        </div>
      </div>

      {plan.financial ? (
        <section className="card-standard">
          {pace ? (
            <>
              <p className="type-hero">
                <Money minor={pace.savedMinor} options={{ withSymbol: false, compactDecimals: true }} />
              </p>
              <p className="type-secondary mt-1">
                de <Money minor={pace.targetMinor} options={{ compactDecimals: true }} /> ·{" "}
                {Math.round(pace.ratio * 100)}%
              </p>
              <ProgressIndicator value={pace.ratio} className="mt-4" />
              <p className="type-meta mt-3">
                Faltam <Money minor={pace.remainingMinor} options={{ compactDecimals: true }} />
                {pace.overdue ? " · a data já passou" : null}
              </p>
              {pace.requiredMonthlyMinor ? (
                <p className="type-meta mt-1">
                  Para chegares à meta na data: cerca de{" "}
                  <Money minor={pace.requiredMonthlyMinor} options={{ compactDecimals: true }} /> por
                  mês. É só informação — nada é separado automaticamente.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="type-hero">
                <Money minor={savedMinor} options={{ withSymbol: false, compactDecimals: true }} />
              </p>
              <p className="type-secondary mt-1">
                Define um valor-alvo para veres quanto precisarias separar por mês.
              </p>
            </>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => setFunding(true)}>
              {savedMinor > 0 ? "Adicionar dinheiro" : "Começar a guardar"}
            </Button>
          </div>
        </section>
      ) : (
        <section className="card-standard">
          <p className="type-secondary">Este plano não envolve dinheiro.</p>
          <Button variant="secondary" className="mt-4" onClick={() => updatePlan(plan.id, { financial: true })}>
            Passar a envolver dinheiro
          </Button>
        </section>
      )}

      {plan.financial && savedMinor > 0 ? (
        <section>
          <SectionHeader title="Dinheiro" />
          <ul className="list-group">
            <li className="list-row justify-between">
              <span>Reservado</span>
              <Money minor={savedMinor} className="font-medium" />
            </li>
            {plan.targetMinor ? (
              <li className="list-row justify-between">
                <span>Falta</span>
                <Money minor={Math.max(0, plan.targetMinor - savedMinor)} className="font-medium" />
              </li>
            ) : null}
            {sources.map((source) => (
              <li key={source.accountId} className="list-row justify-between">
                <span className="type-meta">Está em {source.name}</span>
                <Money minor={source.amountMinor} className="text-sm" />
              </li>
            ))}
          </ul>
          {plan.walletId ? (
            <Button variant="ghost" className="mt-2" asChild>
              <Link to="/app/wallets/$walletId" params={{ walletId: plan.walletId }}>
                Ver movimentos deste plano
              </Link>
            </Button>
          ) : null}
        </section>
      ) : null}

      {plan.financial && plan.funding && plan.funding !== "manual" ? (
        <section>
          <SectionHeader title="Organização futura" />
          <p className="card-standard type-secondary">
            {FUNDING_STRATEGY_LABELS[plan.funding]} para dinheiro que ainda vai entrar. Não tem
            relação com o que já está reservado.
          </p>
        </section>
      ) : null}

      <section>
        <button
          type="button"
          onClick={() => setShowSteps((value) => !value)}
          className="flex w-full items-center justify-between py-2 text-left"
          aria-expanded={showSteps}
        >
          <span className="type-section">Passos</span>
          <span className="type-meta flex items-center gap-1">
            {plan.milestones.length ? `${plan.milestones.filter((m) => m.done).length}/${plan.milestones.length}` : "Opcional"}
            <ChevronDown className={`size-4 transition-transform ${showSteps ? "rotate-180" : ""}`} aria-hidden />
          </span>
        </button>
        {showSteps ? (
          <>
            <div className="list-group">
              {plan.milestones.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="list-row w-full text-left"
                  onClick={() => toggleMilestone(plan.id, item.id)}
                  aria-pressed={item.done}
                >
                  <span
                    className={`icon-tile ${item.done ? "text-primary" : "text-muted-foreground"}`}
                    aria-hidden
                  >
                    <Check className="size-4" />
                  </span>
                  <span className={item.done ? "line-through opacity-60" : ""}>{item.title}</span>
                </button>
              ))}
              {plan.milestones.length === 0 ? (
                <p className="list-row type-meta">Nem todos os planos precisam de passos.</p>
              ) : null}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!milestone.trim()) return;
                addMilestone(plan.id, milestone.trim());
                setMilestone("");
              }}
            >
              <Input
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                placeholder="Adicionar um passo"
                aria-label="Adicionar um passo"
              />
              <Button type="submit" variant="secondary">
                Adicionar
              </Button>
            </form>
          </>
        ) : null}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setShowDetails((value) => !value)}
          className="flex w-full items-center justify-between py-2 text-left"
          aria-expanded={showDetails}
        >
          <span className="type-section">Editar plano</span>
          <ChevronDown className={`size-4 transition-transform ${showDetails ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {showDetails ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={plan.description ?? ""}
                onChange={(e) => updatePlan(plan.id, { description: e.target.value })}
                placeholder="Porque é que este plano te importa?"
              />
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={plan.status}
                onValueChange={(value) => updatePlan(plan.id, { status: value as PlanStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Importância</Label>
              <Select
                value={plan.priority}
                onValueChange={(value) => updatePlan(plan.id, { priority: value as PlanPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLAN_PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {plan.financial ? (
              <div className="space-y-2">
                <Label>Quando entrar dinheiro novo</Label>
                <Select
                  value={plan.funding ?? "manual"}
                  onValueChange={(value) => updatePlan(plan.id, { funding: value as FundingStrategy })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FUNDING_STRATEGY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="type-meta">
                  Isto é uma intenção para dinheiro futuro. Nada se move sem a tua confirmação.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <PlanFundingSheet plan={plan} open={funding} onOpenChange={setFunding} />

      <section>
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={() => {
            removePlan(plan.id);
            toast.success("Plano removido. O dinheiro e o histórico ficam intactos.");
            void navigate({ to: "/app/plans" });
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          Remover plano
        </Button>
      </section>
    </div>
  );
}
