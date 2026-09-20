/**
 * Deterministic insights engine (Phase 07).
 *
 * Every insight is a fact calculated here, before any language model is
 * involved. Language is neutral: no scores, no grades, no judgement. Only the
 * few most relevant facts are surfaced, so the product never becomes noise.
 */
import { formatMoney, formatPercent } from "@/lib/finance/currency";
import {
  categoryDetail,
  comparePeriods,
  goalAnalytics,
  incomeAnalysis,
  largestExpenses,
  netWorthChange,
  protectedAnalytics,
  recurringAnalysis,
  spendingByCategory,
  wealthBuilding,
  weekdayPattern,
  type AnalyticsInput,
} from "./service";
import { formatDay, type Period } from "./periods";

export type InsightKind =
  | "category_change"
  | "large_expense"
  | "upcoming"
  | "goal"
  | "unallocated"
  | "protected_withdrawal"
  | "build_rate"
  | "net_worth"
  | "income_pattern"
  | "weekday_pattern";

export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  detail?: string | undefined;
  /** Higher is more relevant. Only the top few are shown. */
  relevance: number;
  to?: string;
}

const MIN_CATEGORY_CHANGE_RATE = 0.15;
const MIN_RELEVANT_SHARE = 0.1;

export function buildInsights(input: AnalyticsInput, period: Period, limit = 3): Insight[] {
  const currency = input.setup.currencyCode;
  const money = (minor: number) => formatMoney(minor, currency);
  const out: Insight[] = [];

  const hasData = input.transactions.some((tx) => tx.moneyType !== "business");
  if (!hasData) return [];

  // Category movement against the equivalent previous period.
  const current = spendingByCategory(input, period);
  const comparison = comparePeriods(input, period);
  const totalNow = current.reduce((s, c) => s + c.amountMinor, 0);
  for (const slice of current.slice(0, 4)) {
    if (slice.share < MIN_RELEVANT_SHARE) continue;
    const previousTotal = comparison.previous.expensesMinor;
    if (previousTotal <= 0) continue;
    const previousSlice = spendingByCategoryPrevious(input, period, slice.categoryId);
    if (previousSlice <= 0) continue;
    const rate = (slice.amountMinor - previousSlice) / previousSlice;
    if (Math.abs(rate) < MIN_CATEGORY_CHANGE_RATE) continue;
    out.push({
      id: `category-${slice.categoryId}`,
      kind: "category_change",
      title: `${slice.name}: ${rate > 0 ? "aumento" : "redução"} de ${formatPercent(Math.abs(rate) * 100)} face ao período anterior.`,
      detail: `${money(slice.amountMinor)} contra ${money(previousSlice)}.`,
      relevance: 60 + Math.min(30, Math.abs(rate) * 40) + slice.share * 10,
      to: "/app/analytics",
    });
  }

  // Upcoming commitments.
  const recurring = recurringAnalysis(input);
  if (recurring.dueWithin7Days.length > 0) {
    const first = recurring.dueWithin7Days[0]!;
    out.push({
      id: "upcoming",
      kind: "upcoming",
      title:
        recurring.dueWithin7Days.length === 1
          ? `${first.name} (${money(first.amountMinor)}) vence a ${formatDay(new Date(first.date))}.`
          : `${recurring.dueWithin7Days.length} pagamentos vencem nos próximos 7 dias.`,
      detail: `Total: ${money(recurring.dueWithin7Days.reduce((s, i) => s + i.amountMinor, 0))}.`,
      relevance: 85,
      to: "/app/recurring",
    });
  }

  // Wealth building.
  const building = wealthBuilding(input, period);
  if (building.buildRate !== null && building.totalMinor > 0) {
    out.push({
      id: "build-rate",
      kind: "build_rate",
      title: `Direcionaste ${formatPercent(building.buildRate * 100)} das entradas deste período para propósitos guardados.`,
      detail: `${money(building.totalMinor)} de ${money(comparison.current.incomeMinor)}.`,
      relevance: 70,
      to: "/app/analytics",
    });
  }

  // Largest expense.
  const largest = largestExpenses(input, period, 1)[0];
  if (largest && totalNow > 0 && largest.amountMinor / totalNow >= 0.2) {
    out.push({
      id: "largest",
      kind: "large_expense",
      title: `A maior despesa do período foi ${money(largest.amountMinor)}.`,
      detail: largest.description ?? largest.merchant ?? undefined,
      relevance: 65,
      to: "/app/analytics",
    });
  }

  // Money without a purpose.
  if (input.snapshot.unallocatedMinor > 0) {
    out.push({
      id: "unallocated",
      kind: "unallocated",
      title: `${money(input.snapshot.unallocatedMinor)} ainda não têm propósito.`,
      relevance: 80,
      to: "/app/money-map",
    });
  }

  // Protected money movement.
  const prot = protectedAnalytics(input, period);
  if (prot.withdrawnMinor > 0) {
    out.push({
      id: "protected",
      kind: "protected_withdrawal",
      title: `${prot.withdrawals.length} retirada(s) de dinheiro protegido neste período: ${money(prot.withdrawnMinor)}.`,
      relevance: 75,
      to: "/app/protected",
    });
  }

  // Goals.
  const goals = goalAnalytics(input, period);
  if (goals.contributedMinor > 0) {
    out.push({
      id: "goals",
      kind: "goal",
      title: `Colocaste ${money(goals.contributedMinor)} em objetivos neste período.`,
      relevance: 55,
      to: "/app/goals",
    });
  }

  // Net worth.
  const worth = netWorthChange(input, period);
  if (Math.abs(worth.changeMinor) > 0 && worth.startMinor > 0) {
    out.push({
      id: "net-worth",
      kind: "net_worth",
      title: `O património ${worth.changeMinor >= 0 ? "subiu" : "desceu"} ${money(Math.abs(worth.changeMinor))} neste período.`,
      detail: `De ${money(worth.startMinor)} para ${money(worth.endMinor)}.`,
      relevance: 60,
    });
  }

  // Income history — factual only.
  const income = incomeAnalysis(input, period);
  if (income.historicalAverageMinor !== null) {
    out.push({
      id: "income-average",
      kind: "income_pattern",
      title: `Média histórica de entradas: ${money(income.historicalAverageMinor)} por mês.`,
      detail: `Baseada nos últimos ${income.months} meses completos.`,
      relevance: 45,
    });
  }

  // Weekday pattern only with enough history.
  const weekday = weekdayPattern(input);
  if (weekday.sufficient && weekday.topDay) {
    out.push({
      id: "weekday",
      kind: "weekday_pattern",
      title: `Historicamente, ${weekday.topDay.toLowerCase()} é o dia com mais gastos.`,
      detail: `Com base nas últimas ${weekday.weeks} semanas.`,
      relevance: 40,
    });
  }

  return out.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
}

function spendingByCategoryPrevious(input: AnalyticsInput, period: Period, categoryId: string): number {
  return categoryDetail(input, period, categoryId).previousMinor;
}
