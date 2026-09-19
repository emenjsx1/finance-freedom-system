/**
 * Deterministic Personal OS calculations.
 *
 * No AI anywhere in this file. The Agent may explain these results, never
 * produce them. Nothing here mutates data: scenarios are pure functions.
 */
import type { Commitment, Plan, Strategy, StrategyRule } from "./types";

/* ------------------------------ goal pace ------------------------------ */

export interface GoalPace {
  targetMinor: number;
  savedMinor: number;
  remainingMinor: number;
  ratio: number;
  monthsRemaining: number | null;
  /** Average per month needed to reach the target on time. */
  requiredMonthlyMinor: number | null;
  /** True when the target date has already passed. */
  overdue: boolean;
}

export function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  // A target later in the current month still counts as one month of runway.
  return to.getDate() >= from.getDate() ? months : months - 1;
}

export function goalPace(plan: Plan, savedMinor: number, now = new Date()): GoalPace | null {
  if (!plan.financial || !plan.targetMinor || plan.targetMinor <= 0) return null;
  const remainingMinor = Math.max(0, plan.targetMinor - savedMinor);
  const ratio = Math.min(1, savedMinor / plan.targetMinor);

  if (!plan.targetDate) {
    return {
      targetMinor: plan.targetMinor,
      savedMinor,
      remainingMinor,
      ratio,
      monthsRemaining: null,
      requiredMonthlyMinor: null,
      overdue: false,
    };
  }

  const target = new Date(plan.targetDate);
  const months = monthsBetween(now, target);
  const overdue = months < 0 || (months === 0 && target.getTime() < now.getTime());
  const usable = Math.max(1, months);

  return {
    targetMinor: plan.targetMinor,
    savedMinor,
    remainingMinor,
    ratio,
    monthsRemaining: months,
    requiredMonthlyMinor: remainingMinor === 0 ? 0 : Math.ceil(remainingMinor / usable),
    overdue,
  };
}

/* --------------------------- income suggestion -------------------------- */

export interface SuggestionLine {
  ruleId: string;
  label: string;
  targetKind: StrategyRule["targetKind"];
  targetId?: string | undefined;
  amountMinor: number;
}

export interface OrganizeSuggestion {
  incomeMinor: number;
  lines: SuggestionLine[];
  /** Whatever no rule claimed. Money without a purpose is perfectly valid. */
  leftoverMinor: number;
}

/**
 * Evaluates one inflow against the strategy. Percentages split the inflow,
 * fixed amounts take their value (capped by what is left), surplus rules take
 * only what exceeds the amount the person wants to keep available, priority
 * rules consume in order.
 */
export function suggestOrganization(
  strategy: Strategy | null,
  incomeMinor: number,
  options: { availableBeforeMinor?: number; balanceFor?: (rule: StrategyRule) => number } = {},
): OrganizeSuggestion {
  // No strategy, a paused one, or a manual one never organises money by itself.
  if (
    !strategy ||
    strategy.mode === "none" ||
    strategy.mode === "paused" ||
    strategy.mode === "manual" ||
    incomeMinor <= 0
  ) {
    return { incomeMinor, lines: [], leftoverMinor: Math.max(0, incomeMinor) };
  }

  const rules = strategy.rules
    .filter((r) => r.enabled && r.targetKind !== "available")
    .sort((a, b) => a.order - b.order);

  let remaining = incomeMinor;
  const lines: SuggestionLine[] = [];

  for (const rule of rules) {
    if (remaining <= 0) break;
    let amount = 0;

    if (rule.method === "percentage") {
      amount = Math.round((incomeMinor * rule.value) / 100);
    } else if (rule.method === "fixed") {
      amount = rule.value;
    } else if (rule.method === "surplus") {
      const keep = strategy.keepAvailableMinor ?? 0;
      const availableAfter = (options.availableBeforeMinor ?? 0) + incomeMinor;
      amount = Math.max(0, availableAfter - keep);
    } else {
      // priority: fill until the target holds `untilMinor`, otherwise take the rest.
      const held = options.balanceFor?.(rule) ?? 0;
      amount = rule.untilMinor ? Math.max(0, rule.untilMinor - held) : remaining;
    }

    amount = Math.min(amount, remaining);
    if (amount <= 0) continue;
    remaining -= amount;
    lines.push({
      ruleId: rule.id,
      label: rule.label,
      targetKind: rule.targetKind,
      targetId: rule.targetId,
      amountMinor: amount,
    });
  }

  return { incomeMinor, lines, leftoverMinor: remaining };
}

/** Percentage rules that split the same inflow cannot exceed 100%. */
export function percentageConflict(rules: StrategyRule[]): number | null {
  const total = rules
    .filter((r) => r.enabled && r.method === "percentage")
    .reduce((sum, r) => sum + r.value, 0);
  return total > 100 ? total : null;
}

/* ---------------------------- purchase impact --------------------------- */

export interface PurchaseScenario {
  costMinor: number;
  availableBeforeMinor: number;
  availableAfterMinor: number;
  /** True when the purchase would need money that already has a purpose. */
  wouldTouchReserved: boolean;
  reservedMinor: number;
  protectedMinor: number;
  /** Plans are never touched by a simulation. */
  plansUnaffected: string[];
  upcomingCommitmentsMinor: number;
}

export function simulatePurchase(input: {
  costMinor: number;
  availableMinor: number;
  reservedMinor: number;
  protectedMinor: number;
  activePlanNames: string[];
  commitments: Commitment[];
}): PurchaseScenario {
  const availableAfter = input.availableMinor - input.costMinor;
  return {
    costMinor: input.costMinor,
    availableBeforeMinor: input.availableMinor,
    availableAfterMinor: availableAfter,
    wouldTouchReserved: availableAfter < 0,
    reservedMinor: input.reservedMinor,
    protectedMinor: input.protectedMinor,
    plansUnaffected: input.activePlanNames,
    upcomingCommitmentsMinor: input.commitments
      .filter((c) => c.active && c.cadence !== "once")
      .reduce((sum, c) => sum + c.amountMinor, 0),
  };
}

/* ----------------------------- plan conflicts --------------------------- */

export interface PlanConflict {
  monthlyCapacityMinor: number;
  requiredMinor: number;
  gapMinor: number;
  plans: { id: string; name: string; requiredMonthlyMinor: number }[];
}

/**
 * Compares the pace every dated plan needs with the money the person can
 * realistically direct each month. The system shows the conflict; it never
 * silently fixes it.
 */
export function planConflicts(
  paces: { id: string; name: string; requiredMonthlyMinor: number | null }[],
  monthlyCapacityMinor: number,
): PlanConflict | null {
  const dated = paces
    .filter((p): p is { id: string; name: string; requiredMonthlyMinor: number } =>
      typeof p.requiredMonthlyMinor === "number" && p.requiredMonthlyMinor > 0,
    )
    .map((p) => ({ id: p.id, name: p.name, requiredMonthlyMinor: p.requiredMonthlyMinor }));

  if (dated.length === 0) return null;
  const required = dated.reduce((sum, p) => sum + p.requiredMonthlyMinor, 0);
  if (required <= monthlyCapacityMinor) return null;

  return {
    monthlyCapacityMinor,
    requiredMinor: required,
    gapMinor: required - monthlyCapacityMinor,
    plans: dated,
  };
}
