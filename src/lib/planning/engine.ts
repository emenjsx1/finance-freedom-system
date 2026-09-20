/**
 * PLANNING — deterministic monthly and long-term view.
 *
 * This module never moves money and never invents a number. It only reads
 * what the person already wrote down:
 *   - commitments (expected payments),
 *   - active recurring expenses,
 *   - the planned monthly amount of each purpose,
 *   - plans with a cost and a date.
 *
 * Every amount is minor units of the base currency.
 */
import type { Frequency, RecurringRule } from "@/lib/finance/ledger-types";
import type { AllocationRuleItem } from "@/lib/finance/types";
import type { Commitment, CommitmentCadence, Plan } from "@/lib/personal/types";

/* ------------------------------------------------------------------ */
/* Monthly plan                                                        */
/* ------------------------------------------------------------------ */

export type MonthlyCostSource = "commitment" | "recurring";

export interface MonthlyCostLine {
  id: string;
  name: string;
  /** Monthly equivalent of the cost. */
  amountMinor: number;
  source: MonthlyCostSource;
  detail: string;
  /** Id of the commitment or recurring rule behind this line. */
  sourceId: string;
  /** Marked as paid for the month being shown. Nothing moves money. */
  paid: boolean;
}

/** "YYYY-MM" key used to mark a cost as paid in a given month. */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export interface PurposePlanLine {
  id: string;
  name: string;
  /** What the person said they want to put here every month. 0 when unset. */
  plannedMinor: number;
  /** What is reserved for this purpose right now. */
  reservedMinor: number;
  targetMinor?: number | undefined;
}

export type PlanningAlert = "none" | "watch" | "zero";

export interface MonthlyPlan {
  costs: MonthlyCostLine[];
  costsTotalMinor: number;
  purposes: PurposePlanLine[];
  purposesTotalMinor: number;
  /** Costs + planned purpose contributions. */
  outflowMinor: number;
  availableMinor: number;
  /** Available minus the monthly outflow. Can be negative. */
  leftoverMinor: number;
  /** How many months the available money covers the outflow. */
  runwayMonths: number | null;
  /** ISO date when the available money reaches zero at this pace. */
  zeroDateISO: string | null;
  alert: PlanningAlert;
}

const CADENCE_PER_MONTH: Record<CommitmentCadence, number> = {
  monthly: 1,
  weekly: 52 / 12,
  yearly: 1 / 12,
  once: 0,
};

const FREQUENCY_PER_MONTH: Record<Frequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  bimonthly: 1 / 2,
  quarterly: 1 / 3,
  yearly: 1 / 12,
  custom: 1,
};

export const COMMITMENT_CADENCE_DETAIL: Record<CommitmentCadence, string> = {
  monthly: "Todos os meses",
  weekly: "Todas as semanas",
  yearly: "Todos os anos",
  once: "Uma vez — não conta no mês",
};

/** Monthly equivalent of a commitment. A one-off never inflates the month. */
export function monthlyCommitmentMinor(commitment: Commitment): number {
  if (!commitment.active) return 0;
  return Math.round(Math.max(0, commitment.amountMinor) * CADENCE_PER_MONTH[commitment.cadence]);
}

/** Monthly equivalent of a recurring expense rule. */
export function monthlyRecurringMinor(rule: RecurringRule): number {
  if (!rule.active || rule.kind !== "expense") return 0;
  if (rule.frequency === "custom") {
    const days = rule.customIntervalDays && rule.customIntervalDays > 0 ? rule.customIntervalDays : 30;
    return Math.round((Math.max(0, rule.amountMinor) * 365) / 12 / days);
  }
  return Math.round(Math.max(0, rule.amountMinor) * FREQUENCY_PER_MONTH[rule.frequency]);
}

export interface MonthlyPlanInput {
  commitments: Commitment[];
  recurring: RecurringRule[];
  purposes: AllocationRuleItem[];
  /** purposeId → reserved amount right now. */
  reservedByPurpose: Record<string, number>;
  availableMinor: number;
  now?: Date;
}

export function buildMonthlyPlan(input: MonthlyPlanInput): MonthlyPlan {
  const now = input.now ?? new Date();

  const costs: MonthlyCostLine[] = [];
  for (const commitment of input.commitments) {
    const amountMinor = monthlyCommitmentMinor(commitment);
    if (amountMinor <= 0) continue;
    costs.push({
      id: `commitment:${commitment.id}`,
      name: commitment.name,
      amountMinor,
      source: "commitment",
      detail: COMMITMENT_CADENCE_DETAIL[commitment.cadence],
    });
  }
  for (const rule of input.recurring) {
    const amountMinor = monthlyRecurringMinor(rule);
    if (amountMinor <= 0) continue;
    costs.push({
      id: `recurring:${rule.id}`,
      name: rule.name,
      amountMinor,
      source: "recurring",
      detail: "Despesa recorrente",
    });
  }
  costs.sort((a, b) => b.amountMinor - a.amountMinor);

  const purposes: PurposePlanLine[] = input.purposes
    .filter((purpose) => !purpose.archived)
    .map((purpose) => ({
      id: purpose.id,
      name: purpose.name,
      plannedMinor: Math.max(0, purpose.monthlyPlanMinor ?? 0),
      reservedMinor: Math.max(0, input.reservedByPurpose[purpose.id] ?? 0),
      targetMinor: purpose.targetMinor,
    }))
    .sort((a, b) => b.plannedMinor - a.plannedMinor || a.name.localeCompare(b.name, "pt-PT"));

  const costsTotalMinor = costs.reduce((sum, line) => sum + line.amountMinor, 0);
  const purposesTotalMinor = purposes.reduce((sum, line) => sum + line.plannedMinor, 0);
  const outflowMinor = costsTotalMinor + purposesTotalMinor;
  const availableMinor = Math.max(0, input.availableMinor);
  const leftoverMinor = availableMinor - outflowMinor;

  let runwayMonths: number | null = null;
  let zeroDateISO: string | null = null;
  if (outflowMinor > 0) {
    runwayMonths = availableMinor / outflowMinor;
    const days = Math.round(runwayMonths * (365 / 12));
    const zero = new Date(now.getTime());
    zero.setDate(zero.getDate() + days);
    zeroDateISO = zero.toISOString();
  }

  let alert: PlanningAlert = "none";
  if (availableMinor <= 0 || leftoverMinor < 0) alert = "zero";
  else if (runwayMonths !== null && runwayMonths < 2) alert = "watch";

  return {
    costs,
    costsTotalMinor,
    purposes,
    purposesTotalMinor,
    outflowMinor,
    availableMinor,
    leftoverMinor,
    runwayMonths,
    zeroDateISO,
    alert,
  };
}

/* ------------------------------------------------------------------ */
/* Long term — the next 12 months                                      */
/* ------------------------------------------------------------------ */

export interface HorizonGoal {
  planId: string;
  name: string;
  /** What the person said it costs. */
  costMinor: number;
  /** Already reserved for it. */
  reservedMinor: number;
  /** Still to protect. Never negative. */
  toProtectMinor: number;
  targetDate?: string | undefined;
  /** Whole months until the target date. Null when there is no date. */
  monthsLeft: number | null;
  /** What it takes per month to get there in time. Null without a date. */
  monthlyNeededMinor: number | null;
  /** Reserved / cost, 0-1. */
  progress: number;
}

export interface HorizonPlan {
  /** Goals with a date inside the next 12 months. */
  withinYear: HorizonGoal[];
  /** Goals the person wants but has not dated yet. */
  undated: HorizonGoal[];
  /** Goals dated after the next 12 months. */
  later: HorizonGoal[];
  totalCostMinor: number;
  totalReservedMinor: number;
  totalToProtectMinor: number;
  /** Sum of the monthly amounts needed by the dated goals within a year. */
  monthlyNeededMinor: number;
}

export interface HorizonInput {
  plans: Plan[];
  /** purposeId → reserved amount right now. */
  reservedByPurpose: Record<string, number>;
  now?: Date;
}

function monthsBetween(from: Date, toISO: string): number {
  const to = new Date(toISO);
  if (Number.isNaN(to.getTime())) return 0;
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) +
    (to.getDate() >= from.getDate() ? 0 : -1);
  return months;
}

export function buildHorizon(input: HorizonInput): HorizonPlan {
  const now = input.now ?? new Date();
  const withinYear: HorizonGoal[] = [];
  const undated: HorizonGoal[] = [];
  const later: HorizonGoal[] = [];

  for (const plan of input.plans) {
    if (!plan.financial) continue;
    if (plan.status === "completed" || plan.status === "archived") continue;
    const costMinor = Math.max(0, plan.targetMinor ?? 0);
    const reservedMinor = plan.walletId ? Math.max(0, input.reservedByPurpose[plan.walletId] ?? 0) : 0;
    const toProtectMinor = Math.max(0, costMinor - reservedMinor);
    const monthsLeft = plan.targetDate ? monthsBetween(now, plan.targetDate) : null;
    const monthlyNeededMinor =
      monthsLeft === null ? null : Math.ceil(toProtectMinor / Math.max(1, monthsLeft));
    const goal: HorizonGoal = {
      planId: plan.id,
      name: plan.name,
      costMinor,
      reservedMinor,
      toProtectMinor,
      targetDate: plan.targetDate,
      monthsLeft,
      monthlyNeededMinor,
      progress: costMinor > 0 ? Math.min(1, reservedMinor / costMinor) : 0,
    };
    if (monthsLeft === null) undated.push(goal);
    else if (monthsLeft <= 12) withinYear.push(goal);
    else later.push(goal);
  }

  withinYear.sort((a, b) => (a.monthsLeft ?? 0) - (b.monthsLeft ?? 0));
  later.sort((a, b) => (a.monthsLeft ?? 0) - (b.monthsLeft ?? 0));
  undated.sort((a, b) => b.costMinor - a.costMinor);

  const all = [...withinYear, ...undated, ...later];
  return {
    withinYear,
    undated,
    later,
    totalCostMinor: all.reduce((sum, g) => sum + g.costMinor, 0),
    totalReservedMinor: all.reduce((sum, g) => sum + g.reservedMinor, 0),
    totalToProtectMinor: all.reduce((sum, g) => sum + g.toProtectMinor, 0),
    monthlyNeededMinor: withinYear.reduce((sum, g) => sum + (g.monthlyNeededMinor ?? 0), 0),
  };
}
