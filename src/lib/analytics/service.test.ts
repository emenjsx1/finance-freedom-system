import { describe, expect, it } from "vitest";

import { resolvePeriod } from "@/lib/analytics/periods";
import {
  incomeAnalysis,
  periodSummary,
  spendingByCategory,
  wealthBuilding,
  type AnalyticsInput,
} from "@/lib/analytics/service";
import { buildSnapshot } from "@/lib/finance/engine";
import type { Transaction } from "@/lib/finance/ledger-types";
import { DEFAULT_CATEGORIES } from "@/lib/finance/categories";
import { DEFAULT_RULE_ITEMS, EMPTY_SETUP } from "@/lib/storage/local-setup-store";
import type { Account } from "@/lib/finance/types";

const accounts: Account[] = [
  {
    id: "a1",
    name: "Banco",
    type: "bank",
    balanceMinor: 0,
    currencyCode: "MZN",
    includeInNetWorth: true,
    order: 0,
    icon: "🏦",
  } as Account,
  {
    id: "a2",
    name: "Numerário",
    type: "cash",
    balanceMinor: 0,
    currencyCode: "MZN",
    includeInNetWorth: true,
    order: 1,
    icon: "💵",
  } as Account,
];

const now = new Date();
const day = (n: number) => new Date(now.getFullYear(), now.getMonth(), n, 12).toISOString();

function tx(partial: Partial<Transaction> & Pick<Transaction, "id" | "kind" | "amountMinor">): Transaction {
  return {
    occurredAt: day(2),
    createdAt: day(2),
    moneyType: "personal",
    tags: [],
    attachments: [],
    ...partial,
  } as Transaction;
}

function makeInput(transactions: Transaction[]): AnalyticsInput {
  const setup = { ...EMPTY_SETUP, accounts, currencyCode: "MZN" };
  const snapshot = buildSnapshot({
    openingAccounts: accounts,
    ruleItems: DEFAULT_RULE_ITEMS,
    transactions,
    baseCurrency: "MZN",
    exchangeRates: [],
  });
  return { setup, snapshot, transactions, categories: DEFAULT_CATEGORIES, recurring: [] };
}

const period = resolvePeriod("this_month");

describe("analytics service", () => {
  it("A) cash flow is income minus expenses", () => {
    const input = makeInput([
      tx({ id: "1", kind: "income", amountMinor: 10_000_000, accountId: "a1", allocations: [] }),
      tx({ id: "2", kind: "expense", amountMinor: 3_000_000, accountId: "a1", bucketId: "r3" }),
    ]);
    const s = periodSummary(input, period);
    expect(s.incomeMinor).toBe(10_000_000);
    expect(s.expensesMinor).toBe(3_000_000);
    expect(s.netMinor).toBe(7_000_000);
  });

  it("B) transfers do not change income or expenses", () => {
    const base = [tx({ id: "1", kind: "income", amountMinor: 10_000_000, accountId: "a1", allocations: [] })];
    const before = periodSummary(makeInput(base), period);
    const after = periodSummary(
      makeInput([...base, tx({ id: "t", kind: "transfer", amountMinor: 2_000_000, fromAccountId: "a1", toAccountId: "a2" })]),
      period,
    );
    expect(after.incomeMinor).toBe(before.incomeMinor);
    expect(after.expensesMinor).toBe(before.expensesMinor);
    expect(after.transferCount).toBe(1);
  });

  it("C) reallocations do not change income or expenses", () => {
    const base = [tx({ id: "1", kind: "income", amountMinor: 10_000_000, accountId: "a1", allocations: [] })];
    const after = periodSummary(
      makeInput([
        ...base,
        tx({ id: "r", kind: "reallocation", amountMinor: 1_000_000, fromBucketId: "r3", toBucketId: "r1" }),
      ]),
      period,
    );
    expect(after.incomeMinor).toBe(10_000_000);
    expect(after.expensesMinor).toBe(0);
    expect(after.reallocationCount).toBe(1);
  });

  it("D) business money stays out of personal analytics", () => {
    const input = makeInput([
      tx({ id: "b", kind: "income", amountMinor: 10_000_000, accountId: "a1", moneyType: "business", allocations: [] }),
    ]);
    const s = periodSummary(input, period);
    expect(s.incomeMinor).toBe(0);
    expect(s.businessIncomeMinor).toBe(10_000_000);
  });

  it("E) built and build rate follow wealth-building wallets", () => {
    const input = makeInput([
      tx({
        id: "1",
        kind: "income",
        amountMinor: 5_000_000,
        accountId: "a1",
        allocations: [
          { bucketId: "r1", amountMinor: 2_000_000 },
          { bucketId: "r3", amountMinor: 3_000_000 },
        ],
      }),
    ]);
    const w = wealthBuilding(input, period);
    expect(w.totalMinor).toBe(2_000_000);
    expect(w.buildRate).toBeCloseTo(0.4);
  });

  it("G) category totals equal total expenses", () => {
    const input = makeInput([
      tx({ id: "1", kind: "expense", amountMinor: 1_000_00, accountId: "a1", bucketId: "r3", categoryId: "food" }),
      tx({ id: "2", kind: "expense", amountMinor: 2_500_00, accountId: "a1", bucketId: "r3" }),
    ]);
    const s = periodSummary(input, period);
    const total = spendingByCategory(input, period).reduce((sum, c) => sum + c.amountMinor, 0);
    expect(total).toBe(s.expensesMinor);
  });

  it("H/I) editing and deleting expenses moves the totals", () => {
    const one = tx({ id: "1", kind: "expense", amountMinor: 500_00, accountId: "a1", bucketId: "r3" });
    expect(periodSummary(makeInput([one]), period).expensesMinor).toBe(500_00);
    expect(periodSummary(makeInput([{ ...one, amountMinor: 900_00 }]), period).expensesMinor).toBe(900_00);
    expect(periodSummary(makeInput([]), period).expensesMinor).toBe(0);
  });

  it("K) values in a currency without a rate are never summed in", () => {
    const setupAccounts: Account[] = [...accounts, { ...accounts[0]!, id: "a3", currencyCode: "USD" }];
    const transactions = [
      tx({ id: "1", kind: "expense", amountMinor: 100_00, accountId: "a1", bucketId: "r3" }),
      tx({ id: "2", kind: "expense", amountMinor: 100_00, accountId: "a3", bucketId: "r3" }),
    ];
    const snapshot = buildSnapshot({
      openingAccounts: setupAccounts,
      ruleItems: DEFAULT_RULE_ITEMS,
      transactions,
      baseCurrency: "MZN",
      exchangeRates: [],
    });
    const input: AnalyticsInput = {
      setup: { ...EMPTY_SETUP, accounts: setupAccounts, currencyCode: "MZN" },
      snapshot,
      transactions,
      categories: DEFAULT_CATEGORIES,
      recurring: [],
    };
    const s = periodSummary(input, period);
    expect(s.expensesMinor).toBe(100_00);
    expect(s.unconvertedCurrencies).toContain("USD");
  });

  it("M) no historical average without enough complete months", () => {
    const input = makeInput([tx({ id: "1", kind: "income", amountMinor: 1_000_00, accountId: "a1", allocations: [] })]);
    expect(incomeAnalysis(input, period).historicalAverageMinor).toBeNull();
  });
});
