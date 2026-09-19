import { describe, expect, it } from "vitest";

import { buildSnapshot, type LedgerInput } from "./engine";
import { checkIntegrity, debitWalletError } from "./integrity";
import type { Account, AllocationRuleItem } from "./types";
import type { Transaction } from "./ledger-types";

const account: Account = {
  id: "a1",
  name: "BIM",
  type: "bank",
  balanceMinor: 10_000_000,
  currencyCode: "MZN",
  includeInNetWorth: true,
};

const wallets: AllocationRuleItem[] = [
  { id: "life", name: "Vida", percentage: 80, icon: "🏠", kind: "life" },
  { id: "turkey", name: "Turquia", percentage: 20, icon: "✈️", kind: "goals", targetMinor: 5_000_000 },
];

function tx(partial: Partial<Transaction> & Pick<Transaction, "id" | "kind" | "amountMinor">): Transaction {
  return {
    occurredAt: "2026-02-01T10:00:00.000Z",
    createdAt: "2026-02-01T10:00:00.000Z",
    moneyType: "personal",
    tags: [],
    attachments: [],
    ...partial,
  } as Transaction;
}

function input(transactions: Transaction[]): LedgerInput {
  return { openingAccounts: [account], ruleItems: wallets, transactions };
}

describe("financial integrity", () => {
  it("reports a clean ledger as valid", () => {
    const base = input([
      tx({
        id: "t1",
        kind: "income",
        amountMinor: 1_000_000,
        accountId: "a1",
        allocations: [
          { bucketId: "life", amountMinor: 800_000 },
          { bucketId: "turkey", amountMinor: 200_000 },
        ],
      }),
    ]);
    const report = checkIntegrity(base, buildSnapshot(base));
    expect(report.ok).toBe(true);
    expect(report.errorCount).toBe(0);
  });

  it("detects a negative wallet — the impossible reserved state", () => {
    const base = input([tx({ id: "t1", kind: "expense", amountMinor: 200_000, accountId: "a1", bucketId: "turkey" })]);
    const report = checkIntegrity(base, buildSnapshot(base));
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "negative_wallet")).toBe(true);
  });

  it("keeps total = purpose + unallocated", () => {
    const base = input([
      tx({
        id: "t1",
        kind: "income",
        amountMinor: 500_000,
        accountId: "a1",
        allocations: [{ bucketId: "life", amountMinor: 500_000 }],
      }),
    ]);
    const snapshot = buildSnapshot(base);
    expect(snapshot.wealthMinor).toBe(snapshot.purposeTotalMinor + snapshot.unallocatedMinor);
    expect(checkIntegrity(base, snapshot).balanceEquationHolds).toBe(true);
  });

  it("blocks a debit larger than the wallet balance", () => {
    const base = input([
      tx({
        id: "t1",
        kind: "income",
        amountMinor: 100_000,
        accountId: "a1",
        allocations: [{ bucketId: "life", amountMinor: 100_000 }],
      }),
    ]);
    const snapshot = buildSnapshot(base);
    expect(debitWalletError(snapshot, "life", 100_000, "Vida")).toBeNull();
    expect(debitWalletError(snapshot, "life", 100_001, "Vida")).toContain("Vida");
    expect(debitWalletError(snapshot, "turkey", 1, "Turquia")).toContain("não tem dinheiro");
  });

  it("allows editing a movement back into range via credit-back", () => {
    const base = input([
      tx({
        id: "t1",
        kind: "income",
        amountMinor: 100_000,
        accountId: "a1",
        allocations: [{ bucketId: "life", amountMinor: 100_000 }],
      }),
      tx({ id: "t2", kind: "expense", amountMinor: 100_000, accountId: "a1", bucketId: "life" }),
    ]);
    const snapshot = buildSnapshot(base);
    expect(debitWalletError(snapshot, "life", 90_000, "Vida")).not.toBeNull();
    expect(debitWalletError(snapshot, "life", 90_000, "Vida", 100_000)).toBeNull();
  });

  it("detects movements pointing at deleted references", () => {
    const base = input([tx({ id: "t1", kind: "expense", amountMinor: 1, accountId: "ghost", bucketId: "ghost" })]);
    const report = checkIntegrity(base, buildSnapshot(base));
    expect(report.issues.some((i) => i.code === "missing_account")).toBe(true);
    expect(report.issues.some((i) => i.code === "missing_wallet")).toBe(true);
  });
});
