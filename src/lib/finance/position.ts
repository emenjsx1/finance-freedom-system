/**
 * THE single financial position used by every screen.
 *
 * Invariant, always: TOTAL = AVAILABLE + RESERVED.
 *
 * AVAILABLE is physical money with no purpose/reservation attached to it.
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
  const totalMinor = Math.max(0, snapshot.wealthMinor);
  const reservedMinor = Math.min(totalMinor, Math.max(0, snapshot.purposeTotalMinor));
  const availableMinor = totalMinor - reservedMinor;
  return {
    totalMinor,
    availableMinor,
    reservedMinor,
    protectedMinor: Math.min(reservedMinor, Math.max(0, snapshot.protectedMinor)),
    unassignedMinor: availableMinor,
  };
}
