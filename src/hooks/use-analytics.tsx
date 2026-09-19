import { useMemo } from "react";

import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import type { AnalyticsInput } from "@/lib/analytics/service";

/**
 * The analytics input, memoised on the ledger itself. Any financial mutation
 * replaces the ledger state, so derived analytics can never be stale.
 */
export function useAnalyticsInput(): AnalyticsInput {
  const { setup } = useSetup();
  const { ledger, snapshot } = useLedger();

  return useMemo(
    () => ({
      setup,
      snapshot,
      transactions: ledger.transactions,
      categories: ledger.categories,
      recurring: ledger.recurring,
    }),
    [setup, snapshot, ledger.transactions, ledger.categories, ledger.recurring],
  );
}
