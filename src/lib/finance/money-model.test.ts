import { describe, expect, it } from "vitest";

import { buildSnapshot } from "@/lib/finance/engine";
import { financialPosition } from "@/lib/finance/position";
import type { Transaction } from "@/lib/finance/ledger-types";
import type { Account, AllocationRuleItem } from "@/lib/finance/types";
import { DEFAULT_RULE_ITEMS } from "@/lib/storage/local-setup-store";

const accounts = [
  { id: "bim", name: "BIM", type: "bank", balanceMinor: 10_000_000, currencyCode: "MZN", includeInNetWorth: true, order: 0, icon: "🏦" },
  { id: "mpesa", name: "M-Pesa", type: "wallet", balanceMinor: 2_000_000, currencyCode: "MZN", includeInNetWorth: true, order: 1, icon: "📱" },
] as Account[];

const purposes = [
  { id: "turquia", name: "Turquia", kind: "goals", percentage: 0, icon: "✈️", order: 0, source: "plan", planId: "p1" },
  { id: "carro", name: "Carro", kind: "goals", percentage: 0, icon: "🚗", order: 1, source: "custom" },
] as AllocationRuleItem[];

const tx = (p: Partial<Transaction> & Pick<Transaction, "id" | "kind" | "amountMinor">): Transaction =>
  ({ occurredAt: "2024-05-01T10:00:00.000Z", createdAt: "2024-05-01T10:00:00.000Z", moneyType: "personal", tags: [], attachments: [], ...p }) as Transaction;

const snap = (transactions: Transaction[]) =>
  buildSnapshot({ openingAccounts: accounts, ruleItems: purposes, transactions, baseCurrency: "MZN", exchangeRates: [] });

describe("money model: account vs purpose", () => {
  it("ships with no default buckets", () => {
    expect(DEFAULT_RULE_ITEMS).toHaveLength(0);
  });

  it("reserving money does not move it between accounts", () => {
    const s = snap([tx({ id: "1", kind: "reservation", amountMinor: 5_000_000, accountId: "bim", toBucketId: "turquia" })]);
    expect(s.accountBalances["bim"]).toBe(10_000_000);
    expect(s.accountReserved["bim"]).toBe(5_000_000);
    expect(s.accountAvailable["bim"]).toBe(5_000_000);
    expect(s.bucketBalances["turquia"]).toBe(5_000_000);
    expect(s.wealthMinor).toBe(12_000_000);
  });

  it("knows which account holds each purpose, across accounts", () => {
    const s = snap([
      tx({ id: "1", kind: "reservation", amountMinor: 3_000_000, accountId: "bim", toBucketId: "turquia" }),
      tx({ id: "2", kind: "reservation", amountMinor: 1_000_000, accountId: "mpesa", toBucketId: "turquia" }),
    ]);
    expect(s.bucketBalances["turquia"]).toBe(4_000_000);
    expect(s.purposeByAccount["turquia"]?.["bim"]).toBe(3_000_000);
    expect(s.purposeByAccount["turquia"]?.["mpesa"]).toBe(1_000_000);
  });

  it("releasing gives the money back to the same account", () => {
    const s = snap([
      tx({ id: "1", kind: "reservation", amountMinor: 3_000_000, accountId: "bim", toBucketId: "turquia" }),
      tx({ id: "2", kind: "release", amountMinor: 1_000_000, fromBucketId: "turquia" }),
    ]);
    expect(s.accountBalances["bim"]).toBe(10_000_000);
    expect(s.bucketBalances["turquia"]).toBe(2_000_000);
    expect(s.accountAvailable["bim"]).toBe(8_000_000);
  });

  it("changing purpose leaves physical balances untouched", () => {
    const s = snap([
      tx({ id: "1", kind: "reservation", amountMinor: 3_000_000, accountId: "bim", toBucketId: "turquia" }),
      tx({ id: "2", kind: "reallocation", amountMinor: 1_000_000, fromBucketId: "turquia", toBucketId: "carro" }),
    ]);
    expect(s.accountBalances["bim"]).toBe(10_000_000);
    expect(s.bucketBalances["turquia"]).toBe(2_000_000);
    expect(s.bucketBalances["carro"]).toBe(1_000_000);
    expect(s.purposeByAccount["carro"]?.["bim"]).toBe(1_000_000);
  });

  it("transfer moves physical money without touching purposes", () => {
    const s = snap([
      tx({ id: "1", kind: "reservation", amountMinor: 3_000_000, accountId: "bim", toBucketId: "turquia" }),
      tx({ id: "2", kind: "transfer", amountMinor: 2_000_000, fromAccountId: "bim", toAccountId: "mpesa" }),
    ]);
    expect(s.accountBalances["bim"]).toBe(8_000_000);
    expect(s.accountBalances["mpesa"]).toBe(4_000_000);
    expect(s.bucketBalances["turquia"]).toBe(3_000_000);
    expect(s.wealthMinor).toBe(12_000_000);
  });

  it("income stays available until it gets a purpose", () => {
    const s = snap([tx({ id: "1", kind: "income", amountMinor: 2_000_000, accountId: "mpesa" })]);
    const p = financialPosition(s);
    expect(s.accountBalances["mpesa"]).toBe(4_000_000);
    expect(p.totalMinor).toBe(p.availableMinor + p.reservedMinor);
  });

  it("total always equals available plus reserved", () => {
    const s = snap([
      tx({ id: "1", kind: "income", amountMinor: 2_000_000, accountId: "bim" }),
      tx({ id: "2", kind: "reservation", amountMinor: 5_000_000, accountId: "bim", toBucketId: "turquia" }),
      tx({ id: "3", kind: "reallocation", amountMinor: 1_000_000, fromBucketId: "turquia", toBucketId: "carro" }),
    ]);
    const p = financialPosition(s);
    expect(p.totalMinor).toBe(p.availableMinor + p.reservedMinor);
    expect(p.reservedMinor).toBeGreaterThanOrEqual(0);
  });
});
