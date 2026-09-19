import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import {
  comparePeriods,
  goalAnalytics,
  incomeAnalysis,
  largestExpenses,
  netWorthHistory,
  periodSummary,
  protectedAnalytics,
  recurringAnalysis,
  spendingByCategory,
  walletAnalytics,
  wealthBuilding,
  type AnalyticsInput,
} from "@/lib/analytics/service";

/**
 * Analytics tools for the agent. Every number here is calculated by the
 * analytics service; the model only explains what it receives.
 */
export const AGENT_ANALYTICS_TOOLS = [
  "get_period_summary",
  "get_spending_breakdown",
  "compare_periods",
  "get_income_history",
  "get_net_worth_history",
  "get_goal_analytics",
  "get_recurring_expenses",
  "get_wealth_building_summary",
  "get_largest_expenses",
  "get_wallet_activity",
  "get_protected_money_activity",
] as const;

export type AgentAnalyticsTool = (typeof AGENT_ANALYTICS_TOOLS)[number];

export function runAnalyticsTool(
  tool: AgentAnalyticsTool,
  input: AnalyticsInput,
  periodKey: PeriodKey = "this_month",
): unknown {
  const period = resolvePeriod(periodKey);

  switch (tool) {
    case "get_period_summary":
      return { periodo: period.label, parcial: period.partial, ...periodSummary(input, period) };
    case "get_spending_breakdown":
      return { periodo: period.label, categorias: spendingByCategory(input, period) };
    case "compare_periods":
      return comparePeriods(input, period, period.partial ? "equivalent" : "full");
    case "get_income_history":
      return incomeAnalysis(input, period);
    case "get_net_worth_history":
      return netWorthHistory(input, 6);
    case "get_goal_analytics":
      return goalAnalytics(input, period);
    case "get_recurring_expenses":
      return recurringAnalysis(input);
    case "get_wealth_building_summary":
      return wealthBuilding(input, period);
    case "get_largest_expenses":
      return largestExpenses(input, period).map((tx) => ({
        valor: tx.amountMinor,
        descricao: tx.description ?? tx.merchant ?? "",
        data: tx.occurredAt,
      }));
    case "get_wallet_activity":
      return walletAnalytics(input, period);
    case "get_protected_money_activity":
      return protectedAnalytics(input, period);
  }
}

/** Keyword routing — only analytics questions pay for analytics facts. */
export function selectAnalyticsTools(question: string): AgentAnalyticsTool[] {
  const q = question.toLowerCase();
  const has = (...words: string[]) => words.some((w) => q.includes(w));
  const tools = new Set<AgentAnalyticsTool>();

  if (has("resumo", "mês", "mes", "período", "periodo", "balanço", "quanto gastei", "quanto recebi"))
    tools.add("get_period_summary");
  if (has("categoria", "onde", "gast", "despesa")) tools.add("get_spending_breakdown");
  if (has("compar", "mês passado", "mes passado", "anterior", "variação", "variacao"))
    tools.add("compare_periods");
  if (has("entrada", "receb", "salário", "salario", "rendimento")) tools.add("get_income_history");
  if (has("patrimonio", "património", "evolu", "cresc")) tools.add("get_net_worth_history");
  if (has("objetivo", "meta")) tools.add("get_goal_analytics");
  if (has("recorrente", "subscri", "fixa", "mensalidade")) tools.add("get_recurring_expenses");
  if (has("constru", "poupa", "guard")) tools.add("get_wealth_building_summary");
  if (has("maior", "maiores", "caro")) tools.add("get_largest_expenses");
  if (has("carteira", "pote")) tools.add("get_wallet_activity");
  if (has("protegid", "emergência", "emergencia")) tools.add("get_protected_money_activity");

  return [...tools].slice(0, 4);
}
