/**
 * Central financial engine — the single source of truth.
 *
 * Balances are always DERIVED from the immutable transaction list plus the
 * opening balances captured at onboarding. Nothing in the UI mutates a stored
 * balance, so editing and deleting a transaction reverses its effect exactly.
 */
import type { Account, AllocationRuleItem, ExchangeRate } from "./types";
import type { BucketView, Frequency, RecurringRule, Transaction } from "./ledger-types";
import { splitAmount } from "./allocation";
import { orderedWallets, walletBehaviour, type WalletBehaviour } from "./wallet-config";

export interface LedgerInput {
  openingAccounts: Account[];
  ruleItems: AllocationRuleItem[];
  transactions: Transaction[];
  baseCurrency?: string;
  exchangeRates?: ExchangeRate[];
}

export interface WalletView extends BucketView, WalletBehaviour {
  percentage: number;
  archived: boolean;
  color?: string | undefined;
}

export interface CurrencyTotal {
  currencyCode: string;
  totalMinor: number;
  convertedMinor: number | null;
  rate: number | null;
}

export interface LedgerSnapshot {
  accountBalances: Record<string, number>;
  /** Money reserved for some purpose, per physical account. */
  accountReserved: Record<string, number>;
  /** Physical balance minus what is reserved inside that same account. */
  accountAvailable: Record<string, number>;
  /**
   * purposeId → accountId → amount. Answers "the 50.000 for Turquia are in BIM"
   * without ever inventing an account named Turquia.
   */
  purposeByAccount: Record<string, Record<string, number>>;
  bucketBalances: Record<string, number>;
  buckets: BucketView[];
  wallets: WalletView[];
  /** Physical personal money, base currency (converted amounts included when a rate exists). */
  wealthMinor: number;
  /** Sum of wallets flagged included-in-available. */
  spendableMinor: number;
  /** Sum of wallets whose protection level is not normal. */
  protectedMinor: number;
  /** Everything that already has a purpose. */
  purposeTotalMinor: number;
  /** Physical personal money minus purpose money. Never hidden. */
  unallocatedMinor: number;
  totalsByCurrency: CurrencyTotal[];
  /** Currencies that could not be converted to base — never summed blindly. */
  unconvertedCurrencies: string[];
  businessBalanceMinor: number;
}

/** 1 unit of `from` expressed in `to`, or null when no manual rate exists. */
export function findRate(rates: ExchangeRate[], from: string, to: string): number | null {
  if (from === to) return 1;
  const direct = [...rates]
    .filter((r) => r.baseCurrency === from && r.quoteCurrency === to)
    .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0];
  if (direct) return direct.rate;
  const inverse = [...rates]
    .filter((r) => r.baseCurrency === to && r.quoteCurrency === from)
    .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0];
  if (inverse && inverse.rate !== 0) return 1 / inverse.rate;
  return null;
}

/** Attribution bucket for reserved money whose source account is unknown. */
export const UNKNOWN_ACCOUNT = "__sem_conta__";

export function buildSnapshot({
  openingAccounts,
  ruleItems,
  transactions,
  baseCurrency = "MZN",
  exchangeRates = [],
}: LedgerInput): LedgerSnapshot {
  const accountBalances: Record<string, number> = {};
  for (const account of openingAccounts) accountBalances[account.id] = account.balanceMinor;

  const bucketBalances: Record<string, number> = {};
  for (const item of ruleItems) bucketBalances[item.id] = 0;

  let businessBalanceMinor = 0;

  const add = (map: Record<string, number>, key: string | undefined, delta: number) => {
    if (!key) return;
    map[key] = (map[key] ?? 0) + delta;
  };

  /** purposeId → accountId → amount. `UNKNOWN_ACCOUNT` holds pre-cleanup rows. */
  const purposeByAccount: Record<string, Record<string, number>> = {};
  const attribute = (purposeId: string | undefined, accountId: string, delta: number) => {
    if (!purposeId) return;
    const row = (purposeByAccount[purposeId] ??= {});
    row[accountId] = (row[accountId] ?? 0) + delta;
    if (row[accountId] === 0) delete row[accountId];
  };
  /** Takes `amount` out of a purpose, proportionally to where it physically is. */
  const detach = (purposeId: string | undefined, amount: number): Record<string, number> => {
    if (!purposeId) return {};
    const row = purposeByAccount[purposeId] ?? {};
    const entries = Object.entries(row).filter(([, value]) => value > 0);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    if (total <= 0) return { [UNKNOWN_ACCOUNT]: amount };
    const take = Math.min(amount, total);
    const shares = splitAmount(
      take,
      entries.map(([id, value]) => ({ id, percentage: (value / total) * 100 })),
    );
    for (const [accountId, value] of Object.entries(shares)) attribute(purposeId, accountId, -value);
    if (take < amount) {
      shares[UNKNOWN_ACCOUNT] = (shares[UNKNOWN_ACCOUNT] ?? 0) + (amount - take);
    }
    return shares;
  };

  // Attribution depends on the order money actually moved, not on insert order.
  const ordered = [...transactions].sort((a, b) =>
    a.occurredAt === b.occurredAt
      ? a.createdAt.localeCompare(b.createdAt)
      : a.occurredAt.localeCompare(b.occurredAt),
  );

  for (const tx of ordered) {
    // Business money is tracked apart so it never contaminates personal totals.
    if (tx.moneyType === "business") {
      if (tx.kind === "income") businessBalanceMinor += tx.amountMinor;
      if (tx.kind === "expense") businessBalanceMinor -= tx.amountMinor;
      continue;
    }

    switch (tx.kind) {
      case "income": {
        add(accountBalances, tx.accountId, tx.amountMinor);
        for (const allocation of tx.allocations ?? []) {
          add(bucketBalances, allocation.bucketId, allocation.amountMinor);
          attribute(allocation.bucketId, tx.accountId ?? UNKNOWN_ACCOUNT, allocation.amountMinor);
        }
        break;
      }
      case "expense": {
        add(accountBalances, tx.accountId, -tx.amountMinor);
        add(bucketBalances, tx.bucketId, -tx.amountMinor);
        detach(tx.bucketId, tx.amountMinor);
        break;
      }
      case "transfer": {
        add(accountBalances, tx.fromAccountId, -tx.amountMinor);
        add(accountBalances, tx.toAccountId, tx.amountMinor);
        break;
      }
      case "reservation": {
        // Classification only: the physical balance of the account does not move.
        add(bucketBalances, tx.toBucketId, tx.amountMinor);
        attribute(tx.toBucketId, tx.accountId ?? UNKNOWN_ACCOUNT, tx.amountMinor);
        break;
      }
      case "release": {
        add(bucketBalances, tx.fromBucketId, -tx.amountMinor);
        detach(tx.fromBucketId, tx.amountMinor);
        break;
      }
      case "reallocation": {
        // Purpose → purpose. Source-account attribution follows the money.
        if (!tx.fromBucketId && tx.toBucketId) {
          // Pre-cleanup rows written by the plan funding sheet were reservations.
          add(bucketBalances, tx.toBucketId, tx.amountMinor);
          attribute(tx.toBucketId, tx.accountId ?? UNKNOWN_ACCOUNT, tx.amountMinor);
          break;
        }
        add(bucketBalances, tx.fromBucketId, -tx.amountMinor);
        add(bucketBalances, tx.toBucketId, tx.amountMinor);
        const moved = detach(tx.fromBucketId, tx.amountMinor);
        for (const [accountId, value] of Object.entries(moved)) {
          attribute(tx.toBucketId, accountId, value);
        }
        break;
      }
      case "adjustment": {
        // Signed: a correction may add or remove physical money, and the user
        // always says which purpose absorbs the difference.
        const delta = tx.direction === "negative" ? -tx.amountMinor : tx.amountMinor;
        add(accountBalances, tx.accountId, delta);
        for (const allocation of tx.allocations ?? []) {
          const signed = tx.direction === "negative" ? -allocation.amountMinor : allocation.amountMinor;
          add(bucketBalances, allocation.bucketId, signed);
          if (signed >= 0) attribute(allocation.bucketId, tx.accountId ?? UNKNOWN_ACCOUNT, signed);
          else detach(allocation.bucketId, -signed);
        }
        break;
      }
    }
  }

  const visibleWallets = orderedWallets(ruleItems);

  const wallets: WalletView[] = visibleWallets.map((item) => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
    kind: item.kind,
    balanceMinor: bucketBalances[item.id] ?? 0,
    percentage: item.percentage,
    archived: Boolean(item.archived),
    color: item.color,
    ...walletBehaviour(item),
  }));

  const buckets: BucketView[] = wallets.map(({ id, name, icon, kind, balanceMinor }) => ({
    id,
    name,
    icon,
    kind,
    balanceMinor,
  }));

  // Physical money, grouped per currency: amounts in different currencies are
  // never added together without a rate the user supplied.
  const perCurrency = new Map<string, number>();
  for (const account of openingAccounts) {
    if (account.archived) continue;
    if (account.includeInNetWorth === false) continue;
    const code = account.currencyCode ?? baseCurrency;
    perCurrency.set(code, (perCurrency.get(code) ?? 0) + (accountBalances[account.id] ?? 0));
  }

  const totalsByCurrency: CurrencyTotal[] = [...perCurrency.entries()].map(([currencyCode, totalMinor]) => {
    const rate = findRate(exchangeRates, currencyCode, baseCurrency);
    return {
      currencyCode,
      totalMinor,
      rate,
      convertedMinor: rate === null ? null : Math.round(totalMinor * rate),
    };
  });

  const wealthMinor = totalsByCurrency.reduce((sum, t) => sum + (t.convertedMinor ?? 0), 0);
  const unconvertedCurrencies = totalsByCurrency.filter((t) => t.convertedMinor === null).map((t) => t.currencyCode);

  const spendableMinor = wallets
    .filter((w) => w.includedInAvailable)
    .reduce((sum, w) => sum + w.balanceMinor, 0);
  const protectedMinor = wallets
    .filter((w) => w.protectionLevel !== "normal")
    .reduce((sum, w) => sum + w.balanceMinor, 0);
  const purposeTotalMinor = Object.values(bucketBalances).reduce((a, b) => a + b, 0);
  const unallocatedMinor = wealthMinor - purposeTotalMinor;

  return {
    accountBalances,
    bucketBalances,
    buckets,
    wallets,
    wealthMinor,
    spendableMinor,
    protectedMinor,
    purposeTotalMinor,
    unallocatedMinor,
    totalsByCurrency,
    unconvertedCurrencies,
    businessBalanceMinor,
  };
}

/** Factual per-account context for the account detail page. */
export function accountMonthStats(
  transactions: Transaction[],
  accountId: string,
  year: number,
  month: number,
) {
  let inMinor = 0;
  let outMinor = 0;
  let transfersMinor = 0;
  let count = 0;
  let lastAt: string | undefined;

  for (const tx of transactions) {
    const touches =
      tx.accountId === accountId || tx.fromAccountId === accountId || tx.toAccountId === accountId;
    if (!touches) continue;
    if (!lastAt || tx.occurredAt > lastAt) lastAt = tx.occurredAt;

    const date = new Date(tx.occurredAt);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    count += 1;

    if (tx.kind === "income" && tx.accountId === accountId) inMinor += tx.amountMinor;
    if (tx.kind === "expense" && tx.accountId === accountId) outMinor += tx.amountMinor;
    if (tx.kind === "adjustment" && tx.accountId === accountId) {
      if (tx.direction === "negative") outMinor += 0;
      else inMinor += 0;
    }
    // Internal transfers are movement, never income or spending.
    if (tx.kind === "transfer") transfersMinor += tx.amountMinor;
  }

  return { inMinor, outMinor, transfersMinor, count, lastAt };
}

/** Factual per-wallet context for the wallet detail page. */
export function walletMonthStats(
  transactions: Transaction[],
  walletId: string,
  year: number,
  month: number,
) {
  let addedMinor = 0;
  let usedMinor = 0;

  for (const tx of transactions) {
    if (tx.moneyType === "business") continue;
    const date = new Date(tx.occurredAt);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;

    if (tx.kind === "income" || tx.kind === "adjustment") {
      for (const allocation of tx.allocations ?? []) {
        if (allocation.bucketId !== walletId) continue;
        if (tx.kind === "adjustment" && tx.direction === "negative") usedMinor += allocation.amountMinor;
        else addedMinor += allocation.amountMinor;
      }
    }
    if (tx.kind === "expense" && tx.bucketId === walletId) usedMinor += tx.amountMinor;
    if (tx.kind === "reallocation") {
      if (tx.toBucketId === walletId) addedMinor += tx.amountMinor;
      if (tx.fromBucketId === walletId) usedMinor += tx.amountMinor;
    }
  }

  return { addedMinor, usedMinor };
}

/** Every movement that touched a wallet, newest first. */
export function walletActivity(transactions: Transaction[], walletId: string): Transaction[] {
  return transactions
    .filter(
      (tx) =>
        tx.moneyType !== "business" &&
        (tx.bucketId === walletId ||
          tx.fromBucketId === walletId ||
          tx.toBucketId === walletId ||
          (tx.allocations ?? []).some((a) => a.bucketId === walletId)),
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

/** Everything that moved in or out of protected wallets, newest first. */
export function protectedMoneyHistory(transactions: Transaction[], ruleItems: AllocationRuleItem[]) {
  const protectedIds = new Set(
    ruleItems.filter((item) => walletBehaviour(item).protectionLevel !== "normal").map((item) => item.id),
  );
  const rows: {
    tx: Transaction;
    walletId: string;
    direction: "in" | "out";
    amountMinor: number;
    reason?: string | undefined;
  }[] = [];

  for (const tx of transactions) {
    if (tx.moneyType === "business") continue;
    if (tx.kind === "income" || tx.kind === "adjustment") {
      for (const allocation of tx.allocations ?? []) {
        if (!protectedIds.has(allocation.bucketId)) continue;
        rows.push({
          tx,
          walletId: allocation.bucketId,
          direction: tx.kind === "adjustment" && tx.direction === "negative" ? "out" : "in",
          amountMinor: allocation.amountMinor,
          reason: tx.protectedReason,
        });
      }
    }
    if (tx.kind === "reallocation") {
      if (tx.toBucketId && protectedIds.has(tx.toBucketId)) {
        rows.push({ tx, walletId: tx.toBucketId, direction: "in", amountMinor: tx.amountMinor });
      }
      if (tx.fromBucketId && protectedIds.has(tx.fromBucketId)) {
        rows.push({ tx, walletId: tx.fromBucketId, direction: "out", amountMinor: tx.amountMinor, reason: tx.protectedReason });
      }
    }
    if (tx.kind === "expense" && tx.bucketId && protectedIds.has(tx.bucketId)) {
      rows.push({ tx, walletId: tx.bucketId, direction: "out", amountMinor: tx.amountMinor, reason: tx.protectedReason });
    }
  }

  return rows.sort((a, b) => b.tx.occurredAt.localeCompare(a.tx.occurredAt));
}

/** Share of physical money that already has a purpose. Factual, never a score. */
export function organisationRatio(snapshot: { wealthMinor: number; purposeTotalMinor: number }): number | null {
  if (snapshot.wealthMinor <= 0) return null;
  return Math.min(1, Math.max(0, snapshot.purposeTotalMinor / snapshot.wealthMinor));
}

/** Default income distribution derived from the active rule. */
export function previewAllocation(amountMinor: number, ruleItems: AllocationRuleItem[]) {
  const parts = splitAmount(amountMinor, ruleItems);
  return ruleItems.map((item) => ({ bucketId: item.id, amountMinor: parts[item.id] ?? 0 }));
}

export function allocationsTotal(allocations: { amountMinor: number }[]): number {
  return allocations.reduce((sum, a) => sum + a.amountMinor, 0);
}

/** Month summary derived from the same ledger. */
export function monthTotals(
  transactions: Transaction[],
  year: number,
  month: number,
  ruleItems: AllocationRuleItem[] = [],
) {
  const buildingBuckets = new Set(
    ruleItems.filter((r) => r.kind === "wealth" || r.kind === "goals").map((r) => r.id),
  );

  let income = 0;
  let expenses = 0;
  let built = 0;

  for (const tx of transactions) {
    const date = new Date(tx.occurredAt);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    if (tx.kind === "income") {
      income += tx.amountMinor;
      for (const allocation of tx.allocations ?? []) {
        if (buildingBuckets.has(allocation.bucketId)) built += allocation.amountMinor;
      }
    }
    if (tx.kind === "expense") expenses += tx.amountMinor;
  }

  return { income, expenses, built };
}

export function dayTotalSpent(transactions: Transaction[], isoDate: string): number {
  const day = isoDate.slice(0, 10);
  return transactions
    .filter((tx) => tx.kind === "expense" && tx.occurredAt.slice(0, 10) === day)
    .reduce((sum, tx) => sum + tx.amountMinor, 0);
}

/** Factual large-expense awareness — never blocks the user. */
export function largeExpenseRatio(amountMinor: number, bucketBalanceMinor: number): number | null {
  if (bucketBalanceMinor <= 0) return null;
  return amountMinor / bucketBalanceMinor;
}

export const PROTECTED_BUCKET_KINDS = ["protected", "wealth", "goals"] as const;

export function isProtectedBucketKind(kind: string): boolean {
  return (PROTECTED_BUCKET_KINDS as readonly string[]).includes(kind);
}

/** Deterministic history-based suggestions. No AI, nothing leaves the device. */
export function suggestFromHistory(transactions: Transaction[], kind: "expense" | "income") {
  const relevant = transactions
    .filter((tx) => tx.kind === kind)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const recentCategories: string[] = [];
  for (const tx of relevant) {
    if (tx.categoryId && !recentCategories.includes(tx.categoryId)) recentCategories.push(tx.categoryId);
    if (recentCategories.length >= 4) break;
  }

  const count = (key: keyof Transaction) => {
    const tally = new Map<string, number>();
    for (const tx of relevant) {
      const value = tx[key];
      if (typeof value === "string") tally.set(value, (tally.get(value) ?? 0) + 1);
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };

  const frequentCategories = (() => {
    const tally = new Map<string, number>();
    for (const tx of relevant) if (tx.categoryId) tally.set(tx.categoryId, (tally.get(tx.categoryId) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);
  })();

  return {
    recentCategories,
    frequentCategories,
    suggestedAccountId: count("accountId"),
    suggestedBucketId: count("bucketId"),
  };
}

const DAY = 24 * 60 * 60 * 1000;

export function addInterval(date: Date, frequency: Frequency, customIntervalDays = 30): Date {
  const next = new Date(date);
  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "bimonthly":
      next.setMonth(next.getMonth() + 2);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "custom":
      next.setTime(next.getTime() + customIntervalDays * DAY);
      break;
  }
  return next;
}

/** Next occurrence at or after `from`, respecting the rule's end date. */
export function nextOccurrence(rule: RecurringRule, from: Date = new Date()): Date | null {
  if (!rule.active) return null;
  let cursor = new Date(rule.startDate);
  const anchor = rule.lastHandledAt ? new Date(rule.lastHandledAt) : null;
  const floor = anchor && anchor > from ? anchor : from;

  let guard = 0;
  while (cursor.getTime() <= floor.getTime() - DAY || (anchor && cursor <= anchor)) {
    cursor = addInterval(cursor, rule.frequency, rule.customIntervalDays);
    if (++guard > 500) return null;
  }
  if (rule.endDate && cursor > new Date(rule.endDate)) return null;
  return cursor;
}

/** Monthly-equivalent cost, used by the subscriptions view. */
export function monthlyEquivalent(rule: RecurringRule): number {
  const perMonth: Record<Frequency, number> = {
    weekly: 52 / 12,
    biweekly: 26 / 12,
    monthly: 1,
    bimonthly: 0.5,
    quarterly: 1 / 3,
    yearly: 1 / 12,
    custom: 30 / (rule.customIntervalDays || 30),
  };
  return Math.round(rule.amountMinor * perMonth[rule.frequency]);
}
