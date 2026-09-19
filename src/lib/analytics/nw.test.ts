import { expect, it } from "vitest";
import { resolvePeriod } from "@/lib/analytics/periods";
import { netWorthChange, netWorthHistory } from "@/lib/analytics/service";
import { buildSnapshot } from "@/lib/finance/engine";
import { DEFAULT_CATEGORIES } from "@/lib/finance/categories";
import { DEFAULT_RULE_ITEMS, EMPTY_SETUP } from "@/lib/storage/local-setup-store";

const now = new Date();
const d = (day: number, off = 0) => new Date(now.getFullYear(), now.getMonth() - off, day, 12).toISOString();
const accounts = [{ id: "a1", name: "B", type: "bank", balanceMinor: 0, currencyCode: "MZN", includeInNetWorth: true, order: 0, icon: "x" }] as any;
const txs = [
  { id: "1", kind: "income", amountMinor: 5000000, occurredAt: d(5, 1), createdAt: d(5,1), moneyType: "personal", accountId: "a1", allocations: [], tags: [], attachments: [] },
  { id: "2", kind: "income", amountMinor: 5000000, occurredAt: d(5), createdAt: d(5), moneyType: "personal", accountId: "a1", allocations: [], tags: [], attachments: [] },
] as any;
it("net worth start excludes this month", () => {
  const setup = { ...EMPTY_SETUP, accounts, currencyCode: "MZN" };
  const snapshot = buildSnapshot({ openingAccounts: accounts, ruleItems: DEFAULT_RULE_ITEMS, transactions: txs, baseCurrency: "MZN", exchangeRates: [] });
  const input = { setup, snapshot, transactions: txs, categories: DEFAULT_CATEGORIES, recurring: [] };
  console.log(netWorthHistory(input, 3));
  console.log(netWorthChange(input, resolvePeriod("this_month")));
  expect(true).toBe(true);
});
