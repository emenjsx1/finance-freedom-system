/**
 * Deterministic context builder — the agent's only source of financial truth.
 *
 * Every number here comes from the Phase 02 engine snapshot or from the ledger
 * itself. The language model receives already-calculated facts and explains
 * them; it never computes or maintains a balance. Only the sections relevant to
 * the question are included, and every list is capped.
 */
import { activeCategories, findCategory, type Category } from "@/lib/finance/categories";
import { formatMoney } from "@/lib/finance/currency";
import { monthTotals, nextOccurrence, type LedgerSnapshot } from "@/lib/finance/engine";
import type { RecurringRule, Transaction } from "@/lib/finance/ledger-types";
import type { SetupState } from "@/lib/storage/local-setup-store";
import type { Memory, AgentProfile } from "@/lib/agent/types";
import { generateScenarios } from "@/lib/organize/engine";
import { goalPace } from "@/lib/personal/engine";
import {
  PLAN_PRIORITY_LABELS,
  PLAN_STATUS_LABELS,
  PLAN_TYPE_LABELS,
  type PersonalState,
} from "@/lib/personal/types";

import { runAnalyticsTool, selectAnalyticsTools } from "@/lib/agent/analytics-tools";
import type { AnalyticsInput } from "@/lib/analytics/service";

export interface AgentDeps {
  setup: SetupState;
  snapshot: LedgerSnapshot;
  transactions: Transaction[];
  categories: Category[];
  recurring: RecurringRule[];
  memories: Memory[];
  profile: AgentProfile;
  /** Plans, direction, strategy and stored context. Read only with permission. */
  personal?: PersonalState | undefined;
}

const MAX_TRANSACTIONS = 12;
const MAX_CATEGORIES = 8;
const MAX_MEMORIES = 25;

/** The read tools. Each returns plain facts, never prose. */
export const AGENT_READ_TOOLS = [
  "get_financial_summary",
  "get_available_to_spend",
  "get_account_balances",
  "get_wallet_balances",
  "get_goal_status",
  "get_transactions",
  "get_spending_by_category",
  "get_upcoming_transactions",
  "get_financial_rule",
  "get_month_summary",
  "get_personal_context",
  "get_plans",
  "get_direction",
  "get_strategy",
  "simulate_organization",
] as const;

export type AgentReadTool = (typeof AGENT_READ_TOOLS)[number];

function money(minor: number, currency: string) {
  return `${formatMoney(minor, currency, { withSymbol: false, compactDecimals: true })} ${currency}`;
}

export function getFinancialSummary(d: AgentDeps) {
  const s = d.snapshot;
  const c = d.setup.currencyCode;
  return {
    patrimonio: money(s.wealthMinor, c),
    disponivel_para_gastar: money(s.spendableMinor, c),
    protegido: money(s.protectedMinor, c),
    com_proposito: money(s.purposeTotalMinor, c),
    por_distribuir: money(s.unallocatedMinor, c),
    moeda_base: c,
  };
}

export function getAvailableToSpend(d: AgentDeps) {
  const c = d.setup.currencyCode;
  return {
    valor: money(d.snapshot.spendableMinor, c),
    composto_por: d.snapshot.wallets
      .filter((w) => w.includedInAvailable && !w.archived)
      .map((w) => ({ carteira: w.name, saldo: money(w.balanceMinor, c) })),
  };
}

export function getAccountBalances(d: AgentDeps) {
  const c = d.setup.currencyCode;
  return d.setup.accounts
    .filter((a) => !a.archived)
    .map((a) => ({
      id: a.id,
      nome: a.name,
      tipo: a.type,
      saldo: money(d.snapshot.accountBalances[a.id] ?? 0, a.currencyCode ?? c),
    }));
}

export function getWalletBalances(d: AgentDeps) {
  const c = d.setup.currencyCode;
  return d.snapshot.wallets
    .filter((w) => !w.archived)
    .map((w) => ({
      id: w.id,
      nome: w.name,
      saldo: money(w.balanceMinor, c),
      percentagem_da_regra: w.percentage,
      protegida: w.protectionLevel !== "normal",
      conta_para_disponivel: w.includedInAvailable,
    }));
}

export function getGoalStatus(d: AgentDeps) {
  const goalWallets = d.snapshot.wallets.filter((w) => w.kind === "goals" && !w.archived);
  if (goalWallets.length === 0) return { objetivos: [], nota: "O utilizador ainda não definiu objetivos." };
  return {
    objetivos: goalWallets.map((w) => ({
      nome: w.name,
      acumulado: money(w.balanceMinor, d.setup.currencyCode),
    })),
  };
}

export function getTransactions(d: AgentDeps, limit = MAX_TRANSACTIONS) {
  const c = d.setup.currencyCode;
  return d.transactions
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
    .map((tx) => ({
      tipo: tx.kind,
      valor: money(tx.amountMinor, c),
      data: tx.occurredAt.slice(0, 10),
      categoria: tx.categoryId ? findCategory(d.categories, tx.categoryId)?.name : undefined,
      descricao: tx.merchant ?? tx.description,
    }));
}

export function getSpendingByCategory(d: AgentDeps, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const totals = new Map<string, { total: number; count: number }>();
  let all = 0;
  for (const tx of d.transactions) {
    if (tx.kind !== "expense" || tx.moneyType === "business") continue;
    if (tx.occurredAt < since) continue;
    const name = tx.categoryId ? (findCategory(d.categories, tx.categoryId)?.name ?? "Outros") : "Outros";
    const entry = totals.get(name) ?? { total: 0, count: 0 };
    entry.total += tx.amountMinor;
    entry.count += 1;
    totals.set(name, entry);
    all += tx.amountMinor;
  }
  return {
    periodo_dias: days,
    total: money(all, d.setup.currencyCode),
    categorias: [...totals.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, MAX_CATEGORIES)
      .map(([name, v]) => ({
        categoria: name,
        total: money(v.total, d.setup.currencyCode),
        movimentos: v.count,
        percentagem: all > 0 ? Math.round((v.total / all) * 100) : 0,
      })),
  };
}

export function getUpcomingTransactions(d: AgentDeps) {
  return d.recurring
    .filter((r) => r.active)
    .map((r) => ({ rule: r, next: nextOccurrence(r) }))
    .filter((x): x is { rule: RecurringRule; next: Date } => x.next !== null)
    .sort((a, b) => a.next.getTime() - b.next.getTime())
    .slice(0, 6)
    .map(({ rule, next }) => ({
      nome: rule.name,
      valor: money(rule.amountMinor, d.setup.currencyCode),
      data: next.toISOString().slice(0, 10),
      modo: rule.mode === "auto" ? "automático" : "lembrete",
    }));
}

export function getFinancialRule(d: AgentDeps) {
  return d.setup.ruleItems
    .filter((r) => !r.archived)
    .map((r) => ({ carteira: r.name, percentagem: r.percentage }));
}

export function getMonthSummary(d: AgentDeps) {
  const now = new Date();
  const totals = monthTotals(d.transactions, now.getFullYear(), now.getMonth(), d.setup.ruleItems);
  const c = d.setup.currencyCode;
  return {
    mes: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    entradas: money(totals.income, c),
    gastos: money(totals.expenses, c),
    construido: money(totals.built, c),
    saldo_do_mes: money(totals.income - totals.expenses, c),
  };
}

export function getPersonalContext(d: AgentDeps) {
  return {
    perfil: {
      nome: d.profile.preferredName || d.setup.fullName || undefined,
      contexto: d.profile.context || undefined,
      foco: d.profile.focus || undefined,
      prioridades: d.profile.priorities || undefined,
    },
    memorias: d.memories.slice(0, MAX_MEMORIES).map((m) => ({ categoria: m.category, conteudo: m.content })),
  };
}

/**
 * Plans the person created. Amounts always come from the engine snapshot, never
 * from the plan record, so the Agent cannot quote a stale figure.
 */
export function getPlans(d: AgentDeps) {
  if (!d.personal?.permissions.plans) return { acesso: "nao_autorizado" };
  return d.personal.plans
    .filter((p) => p.status === "active" || p.status === "idea")
    .slice(0, 12)
    .map((plan) => {
      const savedMinor = plan.walletId
        ? (d.snapshot.wallets.find((w) => w.id === plan.walletId)?.balanceMinor ?? 0)
        : 0;
      const pace = goalPace(plan, savedMinor);
      return {
        id: plan.id,
        nome: plan.name,
        tipo: PLAN_TYPE_LABELS[plan.type],
        estado: PLAN_STATUS_LABELS[plan.status],
        importancia: PLAN_PRIORITY_LABELS[plan.priority],
        envolve_dinheiro: plan.financial,
        ...(pace
          ? {
              guardado: money(pace.savedMinor, d.setup.currencyCode),
              objetivo: money(pace.targetMinor, d.setup.currencyCode),
              em_falta: money(pace.remainingMinor, d.setup.currencyCode),
              por_mes_necessario:
                pace.requiredMonthlyMinor === null
                  ? undefined
                  : money(pace.requiredMonthlyMinor, d.setup.currencyCode),
            }
          : {}),
        passos: plan.milestones.map((m) => ({ passo: m.title, feito: m.done })),
      };
    });
}

export function getDirection(d: AgentDeps) {
  if (!d.personal?.permissions.personalContext) return { acesso: "nao_autorizado" };
  return {
    frase: d.personal.headline,
    direcao: d.personal.direction.map((item) => ({ horizonte: item.horizon, conteudo: item.content })),
  };
}

/** The strategy is an intention, not an instruction to move money. */
export function getStrategy(d: AgentDeps) {
  const strategy = d.personal?.strategy;
  if (!strategy) return { estrategia: "nenhuma" };
  return {
    nome: strategy.name,
    modo: strategy.mode,
    regras: strategy.rules
      .filter((r) => r.enabled)
      .map((r) => ({ regra: r.label, metodo: r.method, valor: r.value, destino: r.targetKind })),
  };
}

/**
 * Organisation options for the money that already exists.
 *
 * The Agent explains these options; it never produces the numbers itself. The
 * same deterministic engine powers the "Ajuda-me a organizar" screen, so tapping
 * and talking always give the same figures. Nothing here changes money.
 */
export function simulateOrganization(d: AgentDeps) {
  const c = d.setup.currencyCode;
  const monthlyCommitments = (d.personal?.commitments ?? [])
    .filter((item) => item.active && item.cadence === "monthly")
    .reduce((sum, item) => sum + item.amountMinor, 0);

  const scenarios = generateScenarios({
    totalMinor: d.snapshot.wealthMinor,
    currencyCode: c,
    protection: d.snapshot.protectedMinor > 0 ? "amount" : "unsure",
    protectionMinor: d.snapshot.protectedMinor || undefined,
    plans: (d.personal?.plans ?? [])
      .filter((plan) => plan.status === "active" && plan.financial)
      .map((plan) => ({
        planId: plan.id,
        name: plan.name,
        priority: plan.priority,
        targetMinor: plan.targetMinor,
        targetDate: plan.targetDate,
        reservedMinor: plan.walletId ? (d.snapshot.bucketBalances[plan.walletId] ?? 0) : 0,
        include: true,
      })),
    commitmentsMonthlyMinor: monthlyCommitments,
    reserveCommitments: false,
    income: "unsure",
    ownership: "personal",
    flexibility: "balanced",
    minAvailableMinor: 0,
    updatedAt: new Date().toISOString(),
  });

  return {
    total: money(d.snapshot.wealthMinor, c),
    nota: "Opções para organizar dinheiro que já existe. Nada é aplicado sem confirmação no ecrã \"Ajuda-me a organizar\".",
    opcoes: scenarios.map((scenario) => ({
      titulo: scenario.title,
      descricao: scenario.subtitle,
      linhas: scenario.lines.map((line) => ({ proposito: line.label, valor: money(line.amountMinor, c) })),
      consequencias: scenario.notes,
    })),
  };
}

/** Keyword routing — only the relevant tools run, so context stays small. */
export function selectTools(question: string): AgentReadTool[] {
  const q = question.toLowerCase();
  const tools = new Set<AgentReadTool>([
    "get_financial_summary",
    "get_available_to_spend",
    "get_personal_context",
    "get_plans",
  ]);

  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (has("conta", "banco", "bim", "m-pesa", "carteira móvel", "dinheiro onde", "onde está"))
    tools.add("get_account_balances");
  if (has("carteira", "pote", "propósito", "vida", "livre", "construção", "protegid"))
    tools.add("get_wallet_balances");
  if (has("objetivo", "meta", "poupar", "juntar")) tools.add("get_goal_status");
  if (has("gast", "despesa", "categoria", "alimentação", "onde estou a gastar"))
    tools.add("get_spending_by_category");
  if (has("transaç", "movimento", "últim", "recente", "semana", "gastei"))
    tools.add("get_transactions");
  if (has("próxim", "recorrente", "subscri", "pagamento", "fatura", "vence"))
    tools.add("get_upcoming_transactions");
  if (has("direção", "direcao", "futuro", "quero", "sonho", "vida")) tools.add("get_direction");
  if (has("estratégia", "estrategia", "organizar", "distribuir", "guardar sempre"))
    tools.add("get_strategy");
  if (has("organizar", "não sei como", "nao sei como", "reservar", "proteger", "dividir"))
    tools.add("simulate_organization");
  if (has("regra", "distribui", "percentagem", "%")) tools.add("get_financial_rule");
  if (has("mês", "mes", "mensal", "este mês", "fecho", "resumo")) tools.add("get_month_summary");

  // A short or generic question still deserves a useful picture.
  if (tools.size <= 3) {
    tools.add("get_month_summary");
    tools.add("get_wallet_balances");
  }
  return [...tools];
}

export function runTool(tool: AgentReadTool, d: AgentDeps): unknown {
  switch (tool) {
    case "get_financial_summary":
      return getFinancialSummary(d);
    case "get_available_to_spend":
      return getAvailableToSpend(d);
    case "get_account_balances":
      return getAccountBalances(d);
    case "get_wallet_balances":
      return getWalletBalances(d);
    case "get_goal_status":
      return getGoalStatus(d);
    case "get_transactions":
      return getTransactions(d);
    case "get_spending_by_category":
      return getSpendingByCategory(d);
    case "get_upcoming_transactions":
      return getUpcomingTransactions(d);
    case "get_financial_rule":
      return getFinancialRule(d);
    case "get_month_summary":
      return getMonthSummary(d);
    case "get_personal_context":
      return getPersonalContext(d);
    case "get_plans":
      return getPlans(d);
    case "get_direction":
      return getDirection(d);
    case "get_strategy":
      return getStrategy(d);
    case "simulate_organization":
      return simulateOrganization(d);
  }
}

export interface AgentContext {
  data: string;
  moeda: string;
  tem_dados: boolean;
  factos: Record<string, unknown>;
  /** Ids the agent may reference when preparing an action. */
  referencias: {
    contas: { id: string; nome: string }[];
    carteiras: { id: string; nome: string }[];
    categorias: { id: string; nome: string; tipo: string }[];
  };
}

export function buildAgentContext(question: string, d: AgentDeps): AgentContext {
  const factos: Record<string, unknown> = {};
  for (const tool of selectTools(question)) factos[tool] = runTool(tool, d);

  // Analytics facts come from the analytics service, never from the model.
  const analyticsInput: AnalyticsInput = {
    setup: d.setup,
    snapshot: d.snapshot,
    transactions: d.transactions,
    categories: d.categories,
    recurring: d.recurring,
  };
  for (const tool of selectAnalyticsTools(question))
    factos[tool] = runAnalyticsTool(tool, analyticsInput);

  return {
    data: new Date().toISOString().slice(0, 10),
    moeda: d.setup.currencyCode,
    tem_dados: d.transactions.length > 0,
    factos,
    referencias: {
      contas: d.setup.accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, nome: a.name })),
      carteiras: d.snapshot.wallets.filter((w) => !w.archived).map((w) => ({ id: w.id, nome: w.name })),
      categorias: [
        ...activeCategories(d.categories, "expense"),
        ...activeCategories(d.categories, "income"),
      ].map((c) => ({ id: c.id, nome: c.name, tipo: c.kind })),
    },
  };
}

/** Deterministic daily brief — calculated by the app, never by the model. */
export function buildDailyBrief(d: AgentDeps): string[] {
  const c = d.setup.currencyCode;
  const lines: string[] = [];
  lines.push(`Hoje tens ${money(d.snapshot.spendableMinor, c)} disponíveis para gastar.`);
  if (d.snapshot.unallocatedMinor > 0)
    lines.push(`${money(d.snapshot.unallocatedMinor, c)} ainda não têm propósito.`);
  const upcoming = getUpcomingTransactions(d)[0];
  if (upcoming) lines.push(`A próxima despesa planeada é ${upcoming.nome} (${upcoming.valor}) a ${upcoming.data}.`);
  return lines;
}

/** Deterministic week/month review facts. */
export function buildReview(d: AgentDeps, days: number) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const c = d.setup.currencyCode;
  let income = 0;
  let expenses = 0;
  for (const tx of d.transactions) {
    if (tx.occurredAt < since || tx.moneyType === "business") continue;
    if (tx.kind === "income") income += tx.amountMinor;
    if (tx.kind === "expense") expenses += tx.amountMinor;
  }
  return {
    periodo_dias: days,
    recebido: money(income, c),
    gasto: money(expenses, c),
    categorias: getSpendingByCategory(d, days).categorias,
  };
}
