/**
 * Analytics service (Phase 07) — the single place every financial metric is
 * defined.
 *
 * It reads the same immutable ledger the Phase 02 engine derives balances
 * from; it never keeps its own state and never re-implements accounting.
 * Rules that hold everywhere:
 *  - transfers and purpose reallocations never touch income or expenses;
 *  - balance adjustments are reported apart from income/expenses;
 *  - business money is excluded from personal analytics;
 *  - amounts in a currency without a manual rate are never added blindly.
 */
import { findRate, monthlyEquivalent, nextOccurrence, type LedgerSnapshot } from "@/lib/finance/engine";
import { findCategory, type Category } from "@/lib/finance/categories";
import type { RecurringRule, Transaction } from "@/lib/finance/ledger-types";
import type { AllocationRuleItem } from "@/lib/finance/types";
import { walletBehaviour } from "@/lib/finance/wallet-config";
import type { SetupState } from "@/lib/storage/local-setup-store";
import {
  addMonths,
  daysBetween,
  equivalentSlice,
  inPeriod,
  lastMonths,
  monthLabel,
  previousPeriod,
  startOfDay,
  startOfMonth,
  type Period,
} from "./periods";

export interface AnalyticsInput {
  setup: SetupState;
  snapshot: LedgerSnapshot;
  transactions: Transaction[];
  categories: Category[];
  recurring: RecurringRule[];
}

/** Plain-language definitions, shown when the user taps a metric. */
export const METRIC_DEFINITIONS: Record<string, { label: string; explanation: string }> = {
  income: {
    label: "Entradas",
    explanation: "Dinheiro pessoal que entrou durante o período. Transferências e redistribuições não contam.",
  },
  expenses: {
    label: "Gastos",
    explanation: "Dinheiro pessoal que saiu durante o período. Transferências entre contas não são gastos.",
  },
  built: {
    label: "Guardado",
    explanation: "Dinheiro que passou a estar guardado para um propósito durante este período.",
  },
  goals: {
    label: "Objetivos",
    explanation: "Parte das entradas e redistribuições que foi para carteiras de objetivos.",
  },
  net: {
    label: "Resultado",
    explanation: "Entradas menos gastos do período. Não inclui ajustes de saldo.",
  },
  buildRate: {
    label: "Taxa de poupança",
    explanation: "Guardado a dividir pelas entradas pessoais do período. É um facto, não uma nota.",
  },
  spendRate: {
    label: "Percentagem utilizada",
    explanation: "Gastos a dividir pelas entradas pessoais do período.",
  },
  adjustments: {
    label: "Ajustes",
    explanation: "Correções de saldo registadas. Aparecem sempre separadas de entradas e gastos.",
  },
  netWorth: {
    label: "Património",
    explanation: "Dinheiro físico pessoal nas contas incluídas no património, calculado a partir dos registos.",
  },
};

/** Minimum history before a pattern is presented as a pattern. */
export const MIN_WEEKS_FOR_WEEKDAY_PATTERN = 6;
export const MIN_TX_FOR_WEEKDAY_PATTERN = 20;
export const MIN_MONTHS_FOR_INCOME_AVERAGE = 2;

interface Converter {
  convert: (tx: Transaction) => number | null;
  unconverted: Set<string>;
}

function makeConverter(input: AnalyticsInput): Converter {
  const base = input.setup.currencyCode;
  const byAccount = new Map(input.setup.accounts.map((a) => [a.id, a.currencyCode ?? base]));
  const unconverted = new Set<string>();
  return {
    unconverted,
    convert: (tx) => {
      const accountId = tx.accountId ?? tx.fromAccountId ?? tx.toAccountId;
      const code = (accountId && byAccount.get(accountId)) || base;
      if (code === base) return tx.amountMinor;
      const rate = findRate(input.setup.exchangeRates, code, base);
      if (rate === null) {
        unconverted.add(code);
        return null;
      }
      return Math.round(tx.amountMinor * rate);
    },
  };
}

/** Personal, non-business transactions inside a period. */
function personalIn(input: AnalyticsInput, period: Period): Transaction[] {
  return input.transactions.filter((tx) => tx.moneyType !== "business" && inPeriod(tx.occurredAt, period));
}

function walletSets(ruleItems: AllocationRuleItem[]) {
  const building = new Set<string>();
  const goals = new Set<string>();
  const protectedIds = new Set<string>();
  for (const item of ruleItems) {
    const behaviour = walletBehaviour(item);
    if (behaviour.wealthBuilding) building.add(item.id);
    if (item.kind === "goals") goals.add(item.id);
    if (behaviour.protectionLevel !== "normal") protectedIds.add(item.id);
  }
  return { building, goals, protectedIds };
}

export interface PeriodSummary {
  incomeMinor: number;
  expensesMinor: number;
  builtMinor: number;
  goalsMinor: number;
  netMinor: number;
  adjustmentsMinor: number;
  transferCount: number;
  transferMinor: number;
  reallocationCount: number;
  reallocationMinor: number;
  incomeCount: number;
  expenseCount: number;
  averageExpenseMinor: number;
  medianExpenseMinor: number;
  buildRate: number | null;
  spendRate: number | null;
  unconvertedCurrencies: string[];
  businessIncomeMinor: number;
  businessExpenseMinor: number;
}

export function periodSummary(input: AnalyticsInput, period: Period): PeriodSummary {
  const { convert, unconverted } = makeConverter(input);
  const { building, goals } = walletSets(input.setup.ruleItems);

  let incomeMinor = 0;
  let expensesMinor = 0;
  let builtMinor = 0;
  let goalsMinor = 0;
  let adjustmentsMinor = 0;
  let transferCount = 0;
  let transferMinor = 0;
  let reallocationCount = 0;
  let reallocationMinor = 0;
  let incomeCount = 0;
  let businessIncomeMinor = 0;
  let businessExpenseMinor = 0;
  const expenseAmounts: number[] = [];

  for (const tx of input.transactions) {
    if (!inPeriod(tx.occurredAt, period)) continue;
    if (tx.moneyType === "business") {
      // Business money stays out of personal analytics entirely.
      if (tx.kind === "income") businessIncomeMinor += tx.amountMinor;
      if (tx.kind === "expense") businessExpenseMinor += tx.amountMinor;
      continue;
    }
    const amount = convert(tx);
    if (amount === null) continue;

    switch (tx.kind) {
      case "income": {
        incomeMinor += amount;
        incomeCount += 1;
        for (const allocation of tx.allocations ?? []) {
          if (building.has(allocation.bucketId)) builtMinor += allocation.amountMinor;
          if (goals.has(allocation.bucketId)) goalsMinor += allocation.amountMinor;
        }
        break;
      }
      case "expense": {
        expensesMinor += amount;
        expenseAmounts.push(amount);
        break;
      }
      case "transfer": {
        transferCount += 1;
        transferMinor += amount;
        break;
      }
      case "reallocation": {
        reallocationCount += 1;
        reallocationMinor += amount;
        if (building.has(tx.toBucketId ?? "")) builtMinor += amount;
        if (building.has(tx.fromBucketId ?? "")) builtMinor -= amount;
        if (goals.has(tx.toBucketId ?? "")) goalsMinor += amount;
        if (goals.has(tx.fromBucketId ?? "")) goalsMinor -= amount;
        break;
      }
      case "adjustment": {
        adjustmentsMinor += tx.direction === "negative" ? -amount : amount;
        break;
      }
    }
  }

  expenseAmounts.sort((a, b) => a - b);
  const middle = expenseAmounts[Math.floor(expenseAmounts.length / 2)] ?? 0;

  return {
    incomeMinor,
    expensesMinor,
    builtMinor,
    goalsMinor,
    netMinor: incomeMinor - expensesMinor,
    adjustmentsMinor,
    transferCount,
    transferMinor,
    reallocationCount,
    reallocationMinor,
    incomeCount,
    expenseCount: expenseAmounts.length,
    averageExpenseMinor: expenseAmounts.length ? Math.round(expensesMinor / expenseAmounts.length) : 0,
    medianExpenseMinor: middle,
    buildRate: incomeMinor > 0 ? builtMinor / incomeMinor : null,
    spendRate: incomeMinor > 0 ? expensesMinor / incomeMinor : null,
    unconvertedCurrencies: [...unconverted],
    businessIncomeMinor,
    businessExpenseMinor,
  };
}

export interface MoneyFlow {
  receivedMinor: number;
  spentMinor: number;
  builtMinor: number;
  goalsMinor: number;
  protectedMinor: number;
  remainingSpendableMinor: number;
}

/** The flow reflects the accounting architecture: nothing is counted twice. */
export function moneyFlow(input: AnalyticsInput, period: Period): MoneyFlow {
  const summary = periodSummary(input, period);
  const { protectedIds, building } = walletSets(input.setup.ruleItems);
  let protectedAllocated = 0;
  for (const tx of personalIn(input, period)) {
    if (tx.kind !== "income") continue;
    for (const allocation of tx.allocations ?? []) {
      if (protectedIds.has(allocation.bucketId) && !building.has(allocation.bucketId)) {
        protectedAllocated += allocation.amountMinor;
      }
    }
  }
  const remaining = summary.incomeMinor - summary.builtMinor - protectedAllocated - summary.expensesMinor;
  return {
    receivedMinor: summary.incomeMinor,
    spentMinor: summary.expensesMinor,
    builtMinor: summary.builtMinor,
    goalsMinor: summary.goalsMinor,
    protectedMinor: protectedAllocated,
    remainingSpendableMinor: remaining,
  };
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  icon: string;
  amountMinor: number;
  share: number;
  count: number;
}

export function spendingByCategory(input: AnalyticsInput, period: Period): CategorySlice[] {
  const { convert } = makeConverter(input);
  const totals = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const tx of personalIn(input, period)) {
    if (tx.kind !== "expense") continue;
    const amount = convert(tx);
    if (amount === null) continue;
    const id = tx.categoryId ?? "uncategorised";
    const entry = totals.get(id) ?? { amount: 0, count: 0 };
    entry.amount += amount;
    entry.count += 1;
    totals.set(id, entry);
    total += amount;
  }
  return [...totals.entries()]
    .map(([categoryId, entry]) => {
      const category = findCategory(input.categories, categoryId);
      return {
        categoryId,
        name: category?.name ?? "Sem categoria",
        icon: category?.icon ?? "•",
        amountMinor: entry.amount,
        count: entry.count,
        share: total > 0 ? entry.amount / total : 0,
      };
    })
    .sort((a, b) => b.amountMinor - a.amountMinor);
}

export interface CategoryDetail {
  categoryId: string;
  name: string;
  icon: string;
  amountMinor: number;
  previousMinor: number;
  differenceMinor: number;
  changeRate: number | null;
  count: number;
  averageMinor: number;
  largest: Transaction | null;
  transactions: Transaction[];
  comparisonLabel: string;
  equivalent: boolean;
}

export function categoryDetail(input: AnalyticsInput, period: Period, categoryId: string): CategoryDetail {
  const { convert } = makeConverter(input);
  const category = findCategory(input.categories, categoryId);
  const current = personalIn(input, period).filter((tx) => tx.kind === "expense" && (tx.categoryId ?? "uncategorised") === categoryId);

  const previousFull = previousPeriod(period);
  const previous = period.partial ? equivalentSlice(previousFull, period.daysElapsed) : previousFull;
  const previousMinor = input.transactions
    .filter((tx) => tx.moneyType !== "business" && tx.kind === "expense" && (tx.categoryId ?? "uncategorised") === categoryId && inPeriod(tx.occurredAt, previous))
    .reduce((sum, tx) => sum + (convert(tx) ?? 0), 0);

  const amountMinor = current.reduce((sum, tx) => sum + (convert(tx) ?? 0), 0);
  const sorted = [...current].sort((a, b) => b.amountMinor - a.amountMinor);

  return {
    categoryId,
    name: category?.name ?? "Sem categoria",
    icon: category?.icon ?? "•",
    amountMinor,
    previousMinor,
    differenceMinor: amountMinor - previousMinor,
    changeRate: previousMinor > 0 ? (amountMinor - previousMinor) / previousMinor : null,
    count: current.length,
    averageMinor: current.length ? Math.round(amountMinor / current.length) : 0,
    largest: sorted[0] ?? null,
    transactions: [...current].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 20),
    comparisonLabel: previous.label,
    equivalent: period.partial,
  };
}

export interface PeriodComparison {
  current: PeriodSummary;
  previous: PeriodSummary;
  currentLabel: string;
  previousLabel: string;
  equivalent: boolean;
  partialNote: string | null;
}

export function comparePeriods(input: AnalyticsInput, period: Period, mode: "equivalent" | "full" = "equivalent"): PeriodComparison {
  const previousFull = previousPeriod(period);
  const useEquivalent = mode === "equivalent" && period.partial;
  const previous = useEquivalent ? equivalentSlice(previousFull, period.daysElapsed) : previousFull;
  return {
    current: periodSummary(input, period),
    previous: periodSummary(input, previous),
    currentLabel: period.partial ? `${period.label} (${period.daysElapsed} dias)` : period.label,
    previousLabel: previous.label,
    equivalent: useEquivalent,
    partialNote: period.partial
      ? useEquivalent
        ? `Comparação dos mesmos ${period.daysElapsed} dias.`
        : `O período atual tem ${period.daysElapsed} de ${period.totalDays} dias.`
      : null,
  };
}

export interface TrendPoint {
  label: string;
  iso: string;
  expensesMinor: number;
  incomeMinor: number;
}

export function spendingTrend(input: AnalyticsInput, period: Period, granularity: "daily" | "weekly" | "monthly"): TrendPoint[] {
  const { convert } = makeConverter(input);
  const buckets = new Map<string, TrendPoint>();

  const keyFor = (date: Date): { key: string; label: string } => {
    if (granularity === "monthly") {
      const start = startOfMonth(date);
      return { key: start.toISOString(), label: monthLabel(start).slice(0, 3) };
    }
    if (granularity === "weekly") {
      const day = startOfDay(date);
      const weekStart = new Date(day.getFullYear(), day.getMonth(), day.getDate() - ((day.getDay() + 6) % 7));
      return { key: weekStart.toISOString(), label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}` };
    }
    const day = startOfDay(date);
    return { key: day.toISOString(), label: String(day.getDate()) };
  };

  for (const tx of personalIn(input, period)) {
    if (tx.kind !== "expense" && tx.kind !== "income") continue;
    const amount = convert(tx);
    if (amount === null) continue;
    const { key, label } = keyFor(new Date(tx.occurredAt));
    const point = buckets.get(key) ?? { label, iso: key, expensesMinor: 0, incomeMinor: 0 };
    if (tx.kind === "expense") point.expensesMinor += amount;
    else point.incomeMinor += amount;
    buckets.set(key, point);
  }

  return [...buckets.values()].sort((a, b) => a.iso.localeCompare(b.iso));
}

export interface IncomeSource {
  name: string;
  icon: string;
  amountMinor: number;
  count: number;
  share: number;
}

export interface IncomeAnalysis {
  totalMinor: number;
  count: number;
  sources: IncomeSource[];
  history: { label: string; amountMinor: number; partial: boolean }[];
  historicalAverageMinor: number | null;
  months: number;
}

export function incomeAnalysis(input: AnalyticsInput, period: Period, historyMonths = 3): IncomeAnalysis {
  const { convert } = makeConverter(input);
  const totals = new Map<string, { amount: number; count: number; icon: string }>();
  let totalMinor = 0;
  let count = 0;
  for (const tx of personalIn(input, period)) {
    if (tx.kind !== "income") continue;
    const amount = convert(tx);
    if (amount === null) continue;
    const category = findCategory(input.categories, tx.categoryId);
    const name = category?.name ?? tx.merchant ?? "Outros";
    const entry = totals.get(name) ?? { amount: 0, count: 0, icon: category?.icon ?? "•" };
    entry.amount += amount;
    entry.count += 1;
    totals.set(name, entry);
    totalMinor += amount;
    count += 1;
  }

  const history = lastMonths(historyMonths).map((month) => ({
    label: month.label,
    amountMinor: periodSummary(input, month).incomeMinor,
    partial: month.partial,
  }));
  const complete = history.filter((h) => !h.partial && h.amountMinor > 0);

  return {
    totalMinor,
    count,
    sources: [...totals.entries()]
      .map(([name, entry]) => ({
        name,
        icon: entry.icon,
        amountMinor: entry.amount,
        count: entry.count,
        share: totalMinor > 0 ? entry.amount / totalMinor : 0,
      }))
      .sort((a, b) => b.amountMinor - a.amountMinor),
    history,
    historicalAverageMinor:
      complete.length >= MIN_MONTHS_FOR_INCOME_AVERAGE
        ? Math.round(complete.reduce((sum, h) => sum + h.amountMinor, 0) / complete.length)
        : null,
    months: historyMonths,
  };
}

export interface WealthBuildingBreakdown {
  totalMinor: number;
  buildRate: number | null;
  wallets: { id: string; name: string; icon: string; amountMinor: number }[];
}

export function wealthBuilding(input: AnalyticsInput, period: Period): WealthBuildingBreakdown {
  const { building } = walletSets(input.setup.ruleItems);
  const perWallet = new Map<string, number>();
  for (const tx of personalIn(input, period)) {
    if (tx.kind === "income") {
      for (const allocation of tx.allocations ?? []) {
        if (building.has(allocation.bucketId)) {
          perWallet.set(allocation.bucketId, (perWallet.get(allocation.bucketId) ?? 0) + allocation.amountMinor);
        }
      }
    }
    if (tx.kind === "reallocation") {
      if (building.has(tx.toBucketId ?? "")) perWallet.set(tx.toBucketId!, (perWallet.get(tx.toBucketId!) ?? 0) + tx.amountMinor);
      if (building.has(tx.fromBucketId ?? "")) perWallet.set(tx.fromBucketId!, (perWallet.get(tx.fromBucketId!) ?? 0) - tx.amountMinor);
    }
  }
  const summary = periodSummary(input, period);
  return {
    totalMinor: summary.builtMinor,
    buildRate: summary.buildRate,
    wallets: input.setup.ruleItems
      .filter((item) => building.has(item.id))
      .map((item) => ({ id: item.id, name: item.name, icon: item.icon, amountMinor: perWallet.get(item.id) ?? 0 }))
      .filter((w) => w.amountMinor !== 0)
      .sort((a, b) => b.amountMinor - a.amountMinor),
  };
}

export interface NetWorthPoint {
  label: string;
  iso: string;
  netWorthMinor: number;
}

/**
 * Historical net worth rebuilt from the records themselves: opening balances
 * plus every personal movement up to each month end, using exactly the engine's
 * rules. Never inferred from today's balances alone.
 */
export function netWorthHistory(input: AnalyticsInput, months = 6): NetWorthPoint[] {
  const base = input.setup.currencyCode;
  const included = input.setup.accounts.filter((a) => !a.archived && a.includeInNetWorth !== false);
  const rateFor = (code: string) => (code === base ? 1 : findRate(input.setup.exchangeRates, code, base));

  let opening = 0;
  for (const account of included) {
    const rate = rateFor(account.currencyCode ?? base);
    if (rate === null) continue;
    opening += Math.round(account.balanceMinor * rate);
  }

  const includedIds = new Set(included.map((a) => a.id));
  const byAccount = new Map(input.setup.accounts.map((a) => [a.id, a.currencyCode ?? base]));
  const delta = (tx: Transaction): number => {
    if (tx.moneyType === "business") return 0;
    const convert = (accountId: string | undefined, sign: number) => {
      if (!accountId || !includedIds.has(accountId)) return 0;
      const rate = rateFor(byAccount.get(accountId) ?? base);
      if (rate === null) return 0;
      return sign * Math.round(tx.amountMinor * rate);
    };
    switch (tx.kind) {
      case "income":
        return convert(tx.accountId, 1);
      case "expense":
        return convert(tx.accountId, -1);
      case "transfer":
        return convert(tx.toAccountId, 1) + convert(tx.fromAccountId, -1);
      case "adjustment":
        return convert(tx.accountId, tx.direction === "negative" ? -1 : 1);
      default:
        return 0;
    }
  };

  const periods = lastMonths(months);
  const points: NetWorthPoint[] = [];
  const sorted = [...input.transactions].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  for (const month of periods) {
    const cutoff = month.partial ? new Date() : month.end;
    let value = opening;
    for (const tx of sorted) {
      if (new Date(tx.occurredAt) >= cutoff) break;
      value += delta(tx);
    }
    // `iso` is the moment the value refers to (period end), not the month start.
    points.push({ label: month.label, iso: cutoff.toISOString(), netWorthMinor: value });
  }
  return points;
}

export interface NetWorthChange {
  startMinor: number;
  endMinor: number;
  changeMinor: number;
  incomeMinor: number;
  expensesMinor: number;
  adjustmentsMinor: number;
  otherMinor: number;
}

export function netWorthChange(input: AnalyticsInput, period: Period): NetWorthChange {
  const history = netWorthHistory(input, 24);
  const before = [...history].reverse().find((p) => new Date(p.iso) <= period.start);
  const summary = periodSummary(input, period);
  const endMinor = input.snapshot.wealthMinor;
  const startMinor = before ? before.netWorthMinor : endMinor - (summary.netMinor + summary.adjustmentsMinor);
  const changeMinor = endMinor - startMinor;
  return {
    startMinor,
    endMinor,
    changeMinor,
    incomeMinor: summary.incomeMinor,
    expensesMinor: summary.expensesMinor,
    adjustmentsMinor: summary.adjustmentsMinor,
    otherMinor: changeMinor - summary.netMinor - summary.adjustmentsMinor,
  };
}

export interface WalletActivityRow {
  id: string;
  name: string;
  icon: string;
  addedMinor: number;
  usedMinor: number;
  netMinor: number;
  balanceMinor: number;
}

export function walletAnalytics(input: AnalyticsInput, period: Period): WalletActivityRow[] {
  const rows = new Map<string, WalletActivityRow>();
  for (const wallet of input.snapshot.wallets) {
    rows.set(wallet.id, {
      id: wallet.id,
      name: wallet.name,
      icon: wallet.icon,
      addedMinor: 0,
      usedMinor: 0,
      netMinor: 0,
      balanceMinor: wallet.balanceMinor,
    });
  }
  const bump = (id: string | undefined, added: number, used: number) => {
    if (!id) return;
    const row = rows.get(id);
    if (!row) return;
    row.addedMinor += added;
    row.usedMinor += used;
    row.netMinor = row.addedMinor - row.usedMinor;
  };

  for (const tx of personalIn(input, period)) {
    switch (tx.kind) {
      case "income":
        for (const allocation of tx.allocations ?? []) bump(allocation.bucketId, allocation.amountMinor, 0);
        break;
      case "expense":
        bump(tx.bucketId, 0, tx.amountMinor);
        break;
      case "reallocation":
        bump(tx.toBucketId, tx.amountMinor, 0);
        bump(tx.fromBucketId, 0, tx.amountMinor);
        break;
      case "adjustment":
        for (const allocation of tx.allocations ?? []) {
          if (tx.direction === "negative") bump(allocation.bucketId, 0, allocation.amountMinor);
          else bump(allocation.bucketId, allocation.amountMinor, 0);
        }
        break;
      default:
        break;
    }
  }
  return [...rows.values()];
}

export interface ProtectedAnalytics {
  startMinor: number;
  addedMinor: number;
  withdrawnMinor: number;
  endMinor: number;
  withdrawals: { id: string; occurredAt: string; amountMinor: number; reason: string }[];
  reasons: { reason: string; amountMinor: number; count: number }[];
}

export function protectedAnalytics(input: AnalyticsInput, period: Period): ProtectedAnalytics {
  const { protectedIds } = walletSets(input.setup.ruleItems);
  const rows = walletAnalytics(input, period).filter((row) => protectedIds.has(row.id));
  const endMinor = input.snapshot.wallets.filter((w) => protectedIds.has(w.id)).reduce((s, w) => s + w.balanceMinor, 0);
  const addedMinor = rows.reduce((s, r) => s + r.addedMinor, 0);
  const withdrawnMinor = rows.reduce((s, r) => s + r.usedMinor, 0);

  const withdrawals = personalIn(input, period)
    .filter((tx) => {
      const source = tx.kind === "expense" ? tx.bucketId : tx.kind === "reallocation" ? tx.fromBucketId : undefined;
      return Boolean(source && protectedIds.has(source));
    })
    .map((tx) => ({
      id: tx.id,
      occurredAt: tx.occurredAt,
      amountMinor: tx.amountMinor,
      reason: tx.protectedReason?.trim() || "Sem motivo registado",
    }))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const reasonMap = new Map<string, { amountMinor: number; count: number }>();
  for (const w of withdrawals) {
    const entry = reasonMap.get(w.reason) ?? { amountMinor: 0, count: 0 };
    entry.amountMinor += w.amountMinor;
    entry.count += 1;
    reasonMap.set(w.reason, entry);
  }

  return {
    startMinor: endMinor - addedMinor + withdrawnMinor,
    addedMinor,
    withdrawnMinor,
    endMinor,
    withdrawals,
    reasons: [...reasonMap.entries()].map(([reason, e]) => ({ reason, ...e })).sort((a, b) => b.amountMinor - a.amountMinor),
  };
}

export interface GoalAnalytics {
  contributedMinor: number;
  withdrawnMinor: number;
  totalAssignedMinor: number;
  goals: { id: string; name: string; icon: string; contributedMinor: number; balanceMinor: number }[];
}

export function goalAnalytics(input: AnalyticsInput, period: Period): GoalAnalytics {
  const { goals } = walletSets(input.setup.ruleItems);
  const rows = walletAnalytics(input, period).filter((row) => goals.has(row.id));
  return {
    contributedMinor: rows.reduce((s, r) => s + r.addedMinor, 0),
    withdrawnMinor: rows.reduce((s, r) => s + r.usedMinor, 0),
    totalAssignedMinor: rows.reduce((s, r) => s + r.balanceMinor, 0),
    goals: rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      contributedMinor: r.addedMinor,
      balanceMinor: r.balanceMinor,
    })),
  };
}

/** Historical balance of one wallet at each month end. */
export function walletProgress(input: AnalyticsInput, walletId: string, months = 6) {
  const out: { label: string; balanceMinor: number }[] = [];
  const sorted = [...input.transactions].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  for (const month of lastMonths(months)) {
    const cutoff = month.partial ? new Date() : month.end;
    let balance = 0;
    for (const tx of sorted) {
      if (tx.moneyType === "business") continue;
      if (new Date(tx.occurredAt) >= cutoff) break;
      if (tx.kind === "income") {
        for (const a of tx.allocations ?? []) if (a.bucketId === walletId) balance += a.amountMinor;
      } else if (tx.kind === "expense" && tx.bucketId === walletId) balance -= tx.amountMinor;
      else if (tx.kind === "reallocation") {
        if (tx.toBucketId === walletId) balance += tx.amountMinor;
        if (tx.fromBucketId === walletId) balance -= tx.amountMinor;
      } else if (tx.kind === "adjustment") {
        for (const a of tx.allocations ?? []) {
          if (a.bucketId === walletId) balance += tx.direction === "negative" ? -a.amountMinor : a.amountMinor;
        }
      }
    }
    out.push({ label: month.label, balanceMinor: balance });
  }
  return out;
}

export interface RecurringAnalysis {
  totalMonthlyMinor: number;
  items: { id: string; name: string; monthlyMinor: number; amountMinor: number; frequency: string; nextDate: string | null; subscription: boolean }[];
  dueWithin7Days: { id: string; name: string; amountMinor: number; date: string }[];
}

export function recurringAnalysis(input: AnalyticsInput): RecurringAnalysis {
  const active = input.recurring.filter((rule) => rule.active && rule.kind === "expense");
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 86_400_000);

  const items = active
    .map((rule) => {
      const next = nextOccurrence(rule, now);
      return {
        id: rule.id,
        name: rule.name,
        monthlyMinor: monthlyEquivalent(rule),
        amountMinor: rule.amountMinor,
        frequency: rule.frequency,
        nextDate: next ? next.toISOString() : null,
        subscription: Boolean(rule.isSubscription),
      };
    })
    .sort((a, b) => b.monthlyMinor - a.monthlyMinor);

  return {
    totalMonthlyMinor: items.reduce((sum, item) => sum + item.monthlyMinor, 0),
    items,
    dueWithin7Days: items
      .filter((item) => item.nextDate && new Date(item.nextDate) <= soon)
      .map((item) => ({ id: item.id, name: item.name, amountMinor: item.amountMinor, date: item.nextDate! })),
  };
}

export function largestExpenses(input: AnalyticsInput, period: Period, limit = 5): Transaction[] {
  return personalIn(input, period)
    .filter((tx) => tx.kind === "expense")
    .sort((a, b) => b.amountMinor - a.amountMinor)
    .slice(0, limit);
}

export interface MerchantRow {
  name: string;
  count: number;
  amountMinor: number;
}

export function merchantAnalytics(input: AnalyticsInput, period: Period, limit = 5): MerchantRow[] {
  const map = new Map<string, MerchantRow>();
  for (const tx of personalIn(input, period)) {
    if (tx.kind !== "expense") continue;
    const name = tx.merchant?.trim();
    if (!name) continue;
    const row = map.get(name.toLowerCase()) ?? { name, count: 0, amountMinor: 0 };
    row.count += 1;
    row.amountMinor += tx.amountMinor;
    map.set(name.toLowerCase(), row);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.amountMinor - a.amountMinor).slice(0, limit);
}

export interface WeekdayPattern {
  sufficient: boolean;
  weeks: number;
  topDay: string | null;
  totals: { day: string; amountMinor: number }[];
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function weekdayPattern(input: AnalyticsInput, weeks = 12): WeekdayPattern {
  const since = new Date(Date.now() - weeks * 7 * 86_400_000);
  const expenses = input.transactions.filter(
    (tx) => tx.moneyType !== "business" && tx.kind === "expense" && new Date(tx.occurredAt) >= since,
  );
  const totals = WEEKDAYS.map((day) => ({ day, amountMinor: 0 }));
  for (const tx of expenses) {
    const index = new Date(tx.occurredAt).getDay();
    totals[index]!.amountMinor += tx.amountMinor;
  }
  const oldest = expenses.reduce<string | null>((min, tx) => (min && min < tx.occurredAt ? min : tx.occurredAt), null);
  const coveredWeeks = oldest ? Math.max(1, Math.round(daysBetween(new Date(oldest), new Date()) / 7)) : 0;
  const sufficient = expenses.length >= MIN_TX_FOR_WEEKDAY_PATTERN && coveredWeeks >= MIN_WEEKS_FOR_WEEKDAY_PATTERN;
  const top = [...totals].sort((a, b) => b.amountMinor - a.amountMinor)[0];
  return {
    sufficient,
    weeks: coveredWeeks,
    topDay: sufficient && top && top.amountMinor > 0 ? top.day : null,
    totals,
  };
}

/** History of the money that was available to spend at each month end. */
export function availableHistory(input: AnalyticsInput, months = 6) {
  const spendable = input.setup.ruleItems.filter((item) => walletBehaviour(item).includedInAvailable);
  const perWallet = spendable.map((item) => walletProgress(input, item.id, months));
  return lastMonths(months).map((month, index) => ({
    label: month.label,
    amountMinor: perWallet.reduce((sum, series) => sum + (series[index]?.balanceMinor ?? 0), 0),
  }));
}

/** Everything a report or the agent needs, serialisable as-is. */
export function buildReport(input: AnalyticsInput, period: Period) {
  return {
    periodo: period.label,
    parcial: period.partial,
    moeda: input.setup.currencyCode,
    resumo: periodSummary(input, period),
    fluxo: moneyFlow(input, period),
    categorias: spendingByCategory(input, period),
    entradas: incomeAnalysis(input, period),
    construcao: wealthBuilding(input, period),
    objetivos: goalAnalytics(input, period),
    carteiras: walletAnalytics(input, period),
    protegido: protectedAnalytics(input, period),
    recorrentes: recurringAnalysis(input),
    maiores_despesas: largestExpenses(input, period).map((tx) => ({
      valor: tx.amountMinor,
      descricao: tx.description ?? tx.merchant ?? "",
      data: tx.occurredAt,
    })),
    patrimonio: netWorthChange(input, period),
  };
}

export function hasEnoughData(input: AnalyticsInput): boolean {
  return input.transactions.some((tx) => tx.moneyType !== "business");
}

export { addMonths, lastMonths };
