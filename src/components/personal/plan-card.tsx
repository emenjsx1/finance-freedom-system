import { Link } from "@tanstack/react-router";

import { ProgressIndicator } from "@/components/design/progress-indicator";
import { Money } from "@/components/money";
import { Symbol } from "@/lib/icons/symbols";
import { goalPace } from "@/lib/personal/engine";
import { PLAN_PRIORITY_LABELS, PLAN_TYPE_LABELS, PLAN_TYPE_SYMBOL, type Plan } from "@/lib/personal/types";

function monthYear(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("pt-PT", { month: "short", year: "numeric" });
}

export function PlanCard({ plan, savedMinor }: { plan: Plan; savedMinor: number }) {
  const pace = goalPace(plan, savedMinor);
  const meta = [PLAN_TYPE_LABELS[plan.type], monthYear(plan.targetDate)].filter(Boolean).join(" • ");

  return (
    <Link
      to="/app/plans/$planId"
      params={{ planId: plan.id }}
      className="card-interactive block overflow-hidden"
    >
      {plan.coverImageUrl ? (
        <img src={plan.coverImageUrl} alt="" className="-m-4 mb-4 h-28 w-[calc(100%+2rem)] object-cover" />
      ) : null}

      <div className="flex items-start gap-3">
        <span className="icon-tile" aria-hidden>
          <Symbol name={plan.symbol ?? PLAN_TYPE_SYMBOL[plan.type]} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-medium">{plan.name}</p>
          <p className="type-meta truncate">{meta}</p>
        </div>
        <span className="type-meta shrink-0">{PLAN_PRIORITY_LABELS[plan.priority]}</span>
      </div>

      {pace ? (
        <div className="mt-4">
          <p className="type-secondary">
            <Money minor={pace.savedMinor} options={{ withSymbol: false, compactDecimals: true }} />
            <span className="text-muted-foreground"> de </span>
            <Money minor={pace.targetMinor} options={{ compactDecimals: true }} />
          </p>
          <ProgressIndicator value={pace.ratio} className="mt-2" />
          <p className="type-meta mt-2">
            {Math.round(pace.ratio * 100)}% ·{" "}
            {pace.remainingMinor === 0 ? (
              "Objetivo alcançado."
            ) : (
              <>
                faltam <Money minor={pace.remainingMinor} options={{ compactDecimals: true }} />
                {pace.requiredMonthlyMinor ? (
                  <>
                    {" · "}
                    <Money minor={pace.requiredMonthlyMinor} options={{ compactDecimals: true }} />
                    /mês
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>
      ) : plan.financial ? (
        <p className="type-meta mt-4">Sem valor definido.</p>
      ) : plan.milestones.length ? (
        <p className="type-meta mt-4">
          {plan.milestones.filter((m) => m.done).length} de {plan.milestones.length} passos concluídos
        </p>
      ) : null}
    </Link>
  );
}
