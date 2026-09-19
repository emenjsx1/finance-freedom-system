/**
 * THE single financial position used by every screen.
 *
 * Invariant, always: TOTAL = AVAILABLE + RESERVED.
 *
 * AVAILABLE is money with no reservation on it: purpose wallets that behave as
 * spendable, plus money that has no purpose yet.
 * RESERVED is a classification of the same money (protection, plans,
 * commitments). It never creates or destroys money.
 */
import type { LedgerSnapshot } from "./engine";

export interface FinancialPosition {
  totalMinor: number;
  availableMinor: number;
  reservedMinor: number;
  protectedMinor: number;
  /** Part of AVAILABLE that has no purpose at all. */
  unassignedMinor: number;
}

export function financialPosition(snapshot: LedgerSnapshot): FinancialPosition {
  const totalMinor = snapshot.wealthMinor;
  const unassignedMinor = snapshot.unallocatedMinor;
  const availableMinor = snapshot.spendableMinor + unassignedMinor;
  return {
    totalMinor,
    availableMinor,
    reservedMinor: totalMinor - availableMinor,
    protectedMinor: snapshot.protectedMinor,
    unassignedMinor,
  };
}
