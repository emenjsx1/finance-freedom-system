import { useEffect, useRef } from "react";

import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import { migrateMoneyModel } from "@/lib/finance/money-migration";

/**
 * Runs the old-wallet cleanup once per device. Silent by design: it only ever
 * removes purposes that were never used, and links a plan to money it already
 * owned. Nothing the person actually recorded is touched.
 */
export function MoneyModelMigration() {
  const { setup, hydrated: setupReady, update } = useSetup();
  const { ledger, hydrated: ledgerReady } = useLedger();
  const { state, hydrated: personalReady, updatePlan } = usePersonal();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (!setupReady || !ledgerReady || !personalReady) return;
    if (setup.moneyModelMigratedAt) {
      done.current = true;
      return;
    }
    done.current = true;

    const result = migrateMoneyModel({
      ruleItems: setup.ruleItems,
      transactions: ledger.transactions,
      plans: state.plans.map((plan) => ({ id: plan.id, name: plan.name, walletId: plan.walletId })),
    });

    for (const link of result.planLinks) updatePlan(link.planId, { walletId: link.walletId });
    update({
      moneyModelMigratedAt: new Date().toISOString(),
      ...(result.ruleItems ? { ruleItems: result.ruleItems } : {}),
    });
  }, [
    ledger.transactions,
    ledgerReady,
    personalReady,
    setup.moneyModelMigratedAt,
    setup.ruleItems,
    setupReady,
    state.plans,
    update,
    updatePlan,
  ]);

  return null;
}
