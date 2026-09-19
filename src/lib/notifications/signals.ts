/**
 * Deterministic signals.
 *
 * Everything the notification and automation layers can react to is computed
 * HERE, from the financial engine and the Phase 07 analytics service. No new
 * calculation of an existing metric: this module only selects and shapes.
 */
import {
  goalAnalytics,
  moneyFlow,
  netWorthChange,
  periodSummary,
  recurringAnalysis,
  spendingByCategory,
  type AnalyticsInput,
  type PeriodSummary,
} from "@/lib/analytics/service";
import { buildInsights, type Insight } from "@/lib/analytics/insights";
import { monthLabel, resolvePeriod, type Period } from "@/lib/analytics/periods";
import { nextOccurrence } from "@/lib/finance/engine";
import { orderedWallets, walletBehaviour } from "@/lib/finance/wallet-config";
import type { Transaction } from "@/lib/finance/ledger-types";
import type { AllocationRuleItem } from "@/lib/finance/types";
import { daysUntil } from "./time";

/** Thresholds are deterministic and configurable in one place. */
export const SIGNAL_THRESHOLDS = {
  /** A payment is announced this many days before it is due. */
  upcomingDays: 3,
  /** Minimum money worth mentioning at all (minor units). */
  minAmountMinor: 50_00,
  /** Unallocated money is only mentioned above this share of the month's income. */
  unallocatedShare: 0.05,
  /** Re-notify about unallocated money only after this many days… */
  unallocatedCooldownDays: 4,
  /** …unless the amount changed by more than this share. */
  unallocatedChangeShare: 0.2,
  /** A "large" expense is at least this multiple of the recent average expense. */
  largeExpenseMultiple: 3,
  /** …and only with enough history to have a meaningful average. */
  largeExpenseMinCount: 5,
  /** Events are only considered "recent" inside this window. */
  recentHours: 36,
  /** Goal milestones announced at these percentages. */
  goalMilestones: [25, 50, 75, 100],
  /** Goal deadline warnings at these day counts. */
  goalDeadlineDays: [30, 7, 1],
  /** Several payments in the same window collapse into one group. */
  groupFrom: 3,
} as const;

export interface UpcomingPayment {
  id: string;
  name: string;
  amountMinor: number;
  dueISO: string;
  days: number;
  overdue: boolean;
  categoryId?: string | undefined;
  accountId?: string | undefined;
  bucketId?: string | undefined;
}

export interface GoalSignal {
  id: string;
  name: string;
  icon: string;
  balanceMinor: number;
  targetMinor: number | null;
  percent: number | null;
  remainingMinor: number | null;
  deadlineDays: number | null;
  monthlyPlanMinor: number | null;
  contributedThisMonthMinor: number;
}

export interface BalanceSignal {
  id: string;
  name: string;
  balanceMinor: number;
  thresholdMinor: number;
}

export interface Signals {
  now: string;
  currencyCode: string;
  name: string;
  month: Period;
  monthSummary: PeriodSummary;
  availableMinor: number;
  unallocatedMinor: number;
  upcoming: UpcomingPayment[];
  overdue: UpcomingPayment[];
  goals: GoalSignal[];
  lowWallets: BalanceSignal[];
  lowAccounts: BalanceSignal[];
  protectedWithdrawals: { transaction: Transaction; walletName: string }[];
  largeExpenses: {
    transaction: Transaction;
    categoryName?: string | undefined;
    accountName?: string | undefined;
    walletName?: string | undefined;
  }[];
  insights: Insight[];
  topCategory: { name: string; amountMinor: number } | null;
}

function isRecent(iso: string, now: Date): boolean {
  return now.getTime() - new Date(iso).getTime() <= SIGNAL_THRESHOLDS.recentHours * 3_600_000;
}

function goalsOf(items: AllocationRuleItem[]): AllocationRuleItem[] {
  return orderedWallets(items).filter((item) => item.kind === "goals");
}

export function collectSignals(input: AnalyticsInput, now = new Date()): Signals {
  const month = resolvePeriod("this_month", undefined, now);
  const summary = periodSummary(input, month);
  const recurring = recurringAnalysis(input);
  const goalStats = goalAnalytics(input, month);
  const categories = spendingByCategory(input, month);

  const upcoming: UpcomingPayment[] = [];
  const overdue: UpcomingPayment[] = [];
  for (const rule of input.recurring) {
    if (!rule.active || rule.kind !== "expense") continue;
    const next = nextOccurrence(rule, now);
    if (!next) continue;
    const days = daysUntil(next.toISOString(), now);
    const entry: UpcomingPayment = {
      id: rule.id,
      name: rule.name,
      amountMinor: rule.amountMinor,
      dueISO: next.toISOString(),
      days,
      overdue: days < 0,
      categoryId: rule.categoryId,
      accountId: rule.accountId,
      bucketId: rule.bucketId,
    };
    if (days < 0) overdue.push(entry);
    else if (days <= SIGNAL_THRESHOLDS.upcomingDays) upcoming.push(entry);
  }
  upcoming.sort((a, b) => a.days - b.days);
  overdue.sort((a, b) => a.days - b.days);
  // Recurring analysis stays the single source of monthly commitment totals.
  void recurring.totalMonthlyMinor;

  const goals: GoalSignal[] = goalsOf(input.setup.ruleItems).map((item) => {
    const balanceMinor = input.snapshot.bucketBalances[item.id] ?? 0;
    const targetMinor = item.targetMinor && item.targetMinor > 0 ? item.targetMinor : null;
    const contributed = goalStats.goals.find((g) => g.id === item.id)?.contributedMinor ?? 0;
    return {
      id: item.id,
      name: item.name,
      icon: item.icon,
      balanceMinor,
      targetMinor,
      percent: targetMinor ? Math.floor((balanceMinor / targetMinor) * 100) : null,
      remainingMinor: targetMinor ? Math.max(targetMinor - balanceMinor, 0) : null,
      deadlineDays: item.targetDate ? daysUntil(item.targetDate, now) : null,
      monthlyPlanMinor: item.monthlyPlanMinor && item.monthlyPlanMinor > 0 ? item.monthlyPlanMinor : null,
      contributedThisMonthMinor: contributed,
    };
  });

  const lowWallets: BalanceSignal[] = orderedWallets(input.setup.ruleItems)
    .filter((item) => (item.lowBalanceThresholdMinor ?? 0) > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      balanceMinor: input.snapshot.bucketBalances[item.id] ?? 0,
      thresholdMinor: item.lowBalanceThresholdMinor!,
    }))
    .filter((row) => row.balanceMinor < row.thresholdMinor);

  const lowAccounts: BalanceSignal[] = input.setup.accounts
    .filter((account) => !account.archived && (account.lowBalanceThresholdMinor ?? 0) > 0)
    .map((account) => ({
      id: account.id,
      name: account.name,
      balanceMinor: input.snapshot.accountBalances[account.id] ?? 0,
      thresholdMinor: account.lowBalanceThresholdMinor!,
    }))
    .filter((row) => row.balanceMinor < row.thresholdMinor);

  const walletName = (id?: string) => input.setup.ruleItems.find((w) => w.id === id)?.name;
  const accountName = (id?: string) => input.setup.accounts.find((a) => a.id === id)?.name;
  const categoryName = (id?: string) => input.categories.find((c) => c.id === id)?.name;

  const protectedIds = new Set(
    input.setup.ruleItems.filter((item) => walletBehaviour(item).protectionLevel !== "normal").map((i) => i.id),
  );

  const protectedWithdrawals = input.transactions
    .filter((tx) => tx.moneyType !== "business" && isRecent(tx.createdAt, now))
    .filter(
      (tx) =>
        (tx.kind === "reallocation" && protectedIds.has(tx.fromBucketId ?? "")) ||
        (tx.kind === "expense" && protectedIds.has(tx.bucketId ?? "")),
    )
    .map((tx) => ({
      transaction: tx,
      walletName: walletName(tx.kind === "reallocation" ? tx.fromBucketId : tx.bucketId) ?? "Carteira protegida",
    }));

  const largeThreshold =
    summary.expenseCount >= SIGNAL_THRESHOLDS.largeExpenseMinCount
      ? summary.averageExpenseMinor * SIGNAL_THRESHOLDS.largeExpenseMultiple
      : null;

  const largeExpenses = largeThreshold
    ? input.transactions
        .filter(
          (tx) =>
            tx.kind === "expense" &&
            tx.moneyType !== "business" &&
            isRecent(tx.createdAt, now) &&
            tx.amountMinor >= largeThreshold,
        )
        .map((tx) => ({
          transaction: tx,
          categoryName: categoryName(tx.categoryId),
          accountName: accountName(tx.accountId),
          walletName: walletName(tx.bucketId),
        }))
    : [];

  const top = categories[0];

  return {
    now: now.toISOString(),
    currencyCode: input.setup.currencyCode,
    name: input.setup.fullName,
    month,
    monthSummary: summary,
    availableMinor: input.snapshot.spendableMinor,
    unallocatedMinor: input.snapshot.unallocatedMinor,
    upcoming,
    overdue,
    goals,
    lowWallets,
    lowAccounts,
    protectedWithdrawals,
    largeExpenses,
    insights: buildInsights(input, month, 2),
    topCategory: top ? { name: top.name, amountMinor: top.amountMinor } : null,
  };
}

/** Facts for the weekly review — same analytics service, one period. */
export function weeklyFacts(input: AnalyticsInput, period: Period) {
  const summary = periodSummary(input, period);
  const categories = spendingByCategory(input, period);
  const flow = moneyFlow(input, period);
  return { summary, topCategory: categories[0] ?? null, flow };
}

/** Facts for the monthly close. */
export function monthlyFacts(input: AnalyticsInput, period: Period) {
  const summary = periodSummary(input, period);
  const categories = spendingByCategory(input, period);
  const change = netWorthChange(input, period);
  return { summary, categories: categories.slice(0, 3), change, label: monthLabel(period.start, true) };
}
