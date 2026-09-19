import type { AllocationRuleItem, Account, Bucket } from "./types";

/** Sum of percentages of a rule. */
export function totalPercentage(items: Pick<AllocationRuleItem, "percentage">[]): number {
  return items.reduce((sum, item) => sum + (Number.isFinite(item.percentage) ? item.percentage : 0), 0);
}

export function isRuleValid(items: Pick<AllocationRuleItem, "percentage">[]): boolean {
  return Math.abs(totalPercentage(items) - 100) < 0.001 && items.length > 0;
}

/**
 * Split an income amount across rule items using integer minor units.
 * The largest-remainder method guarantees the parts add up exactly.
 */
export function splitAmount(
  amountMinor: number,
  items: Pick<AllocationRuleItem, "id" | "percentage">[],
): Record<string, number> {
  const exact = items.map((item) => ({
    id: item.id,
    value: (amountMinor * item.percentage) / 100,
  }));
  const floored = exact.map((e) => ({ id: e.id, base: Math.floor(e.value), rem: e.value - Math.floor(e.value) }));
  let remainder = amountMinor - floored.reduce((s, f) => s + f.base, 0);

  const byRemainder = [...floored].sort((a, b) => b.rem - a.rem);
  for (const entry of byRemainder) {
    if (remainder <= 0) break;
    entry.base += 1;
    remainder -= 1;
  }

  return Object.fromEntries(floored.map((f) => [f.id, f.base]));
}

/** Total wealth = everything the person physically owns. */
export function totalWealthMinor(accounts: Pick<Account, "balanceMinor">[]): number {
  return accounts.reduce((sum, a) => sum + a.balanceMinor, 0);
}

/**
 * Spendable = money in buckets meant for spending, not protected or committed.
 * Account balance is NOT spendable money.
 */
export function spendableMinor(buckets: Pick<Bucket, "kind" | "balanceMinor">[]): number {
  return buckets
    .filter((b) => b.kind === "life" || b.kind === "free")
    .reduce((sum, b) => sum + b.balanceMinor, 0);
}
