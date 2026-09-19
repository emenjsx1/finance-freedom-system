/**
 * Central financial engine — the single source of truth.
 *
 * Balances are always DERIVED from the immutable transaction list plus the
 * opening balances captured at onboarding. Nothing in the UI mutates a stored
 * balance, so editing and deleting a transaction reverses its effect exactly.
 */
import type { Account, AllocationRuleItem } from "./types";
import type { BucketView, Frequency, RecurringRule, Transaction } from "./ledger-types";
import { splitAmount } from "./allocation";

export interface LedgerInput {
  openingAccounts: Account[];
  ruleItems: AllocationRuleItem[];
  transactions: Transaction[];
}

export interface LedgerSnapshot {
  accountBalances: Record<string, number>;
  bucketBalances: Record<string, number>;
  buckets: BucketView[];
  wealthMinor: number;
  spendableMinor: number;
}

export function buildSnapshot({ openingAccounts, ruleItems, transactions }: LedgerInput): LedgerSnapshot {
  const accountBalances: Record<string, number> = {};
  for (const account of openingAccounts) accountBalances[account.id] = account.balanceMinor;

  const bucketBalances: Record<string, number> = {};
  for (const item of ruleItems) bucketBalances[item.id] = 0;

  const add = (map: Record<string, number>, key: string | undefined, delta: number) => {
    if (!key) return;
    map[key] = (map[key] ?? 0) + delta;
  };

  for (const tx of transactions) {
    switch (tx.kind) {
      case "income": {
        add(accountBalances, tx.accountId, tx.amountMinor);
        for (const allocation of tx.allocations ?? []) {
          add(bucketBalances, allocation.bucketId, allocation.amountMinor);
        }
        break;
      }
      case "expense": {
        add(accountBalances, tx.accountId, -tx.amountMinor);
        add(bucketBalances, tx.bucketId, -tx.amountMinor);
        break;
      }
      case "transfer": {
        add(accountBalances, tx.fromAccountId, -tx.amountMinor);
        add(accountBalances, tx.toAccountId, tx.amountMinor);
        break;
      }
      case "reallocation": {
        add(bucketBalances, tx.fromBucketId, -tx.amountMinor);
        add(bucketBalances, tx.toBucketId, tx.amountMinor);
        break;
      }
    }
  }

  const buckets: BucketView[] = ruleItems.map((item) => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
    kind: item.kind,
    balanceMinor: bucketBalances[item.id] ?? 0,
  }));

  const wealthMinor = Object.values(accountBalances).reduce((a, b) => a + b, 0);
  const spendableMinor = buckets
    .filter((b) => b.kind === "life" || b.kind === "free")
    .reduce((sum, b) => sum + b.balanceMinor, 0);

  return { accountBalances, bucketBalances, buckets, wealthMinor, spendableMinor };
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
