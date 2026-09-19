/**
 * PURPOSES — "what is this money for".
 *
 * A purpose is never a place. Money always sits in an `Account`; a purpose is a
 * label on part of that money. The two lists describe the same meticais from
 * two angles, so they must never be added together.
 */
import type { LedgerSnapshot } from "./engine";
import { UNKNOWN_ACCOUNT } from "./engine";
import type { AllocationRuleItem, PurposeSource } from "./types";
import { isProtectedWallet } from "./wallet-config";

export interface PurposeLocation {
  accountId: string;
  amountMinor: number;
}

export interface PurposeView {
  id: string;
  name: string;
  icon: string;
  source: PurposeSource;
  planId?: string | undefined;
  balanceMinor: number;
  protected: boolean;
  /** Where the reserved money physically is. Empty for pre-cleanup records. */
  locations: PurposeLocation[];
  /** Part of the balance whose source account was never recorded. */
  unknownSourceMinor: number;
}

export const PURPOSE_SOURCE_LABELS: Record<PurposeSource, string> = {
  plan: "Plano",
  protection: "Proteção",
  commitment: "Compromisso",
  custom: "Criado por ti",
  legacy: "Configuração antiga",
};

/** Best-effort origin for records created before purposes carried a source. */
export function purposeSourceOf(item: AllocationRuleItem): PurposeSource {
  if (item.source) return item.source;
  if (item.planId) return "plan";
  if (item.kind === "protected") return "protection";
  return "custom";
}

export function purposeView(item: AllocationRuleItem, snapshot: LedgerSnapshot): PurposeView {
  const row = snapshot.purposeByAccount[item.id] ?? {};
  const locations = Object.entries(row)
    .filter(([accountId, amount]) => accountId !== UNKNOWN_ACCOUNT && amount !== 0)
    .map(([accountId, amountMinor]) => ({ accountId, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
  return {
    id: item.id,
    name: item.name,
    icon: item.icon,
    source: purposeSourceOf(item),
    planId: item.planId,
    balanceMinor: snapshot.bucketBalances[item.id] ?? 0,
    protected: isProtectedWallet(item),
    locations,
    unknownSourceMinor: row[UNKNOWN_ACCOUNT] ?? 0,
  };
}

/**
 * Every purpose the person can choose, each appearing exactly once. A plan and
 * its money are one identity, so a plan can never show up twice.
 */
export function listPurposes(
  ruleItems: AllocationRuleItem[],
  snapshot: LedgerSnapshot,
): PurposeView[] {
  const seenPlans = new Set<string>();
  const views: PurposeView[] = [];
  for (const item of ruleItems) {
    if (item.archived) continue;
    if (item.planId) {
      if (seenPlans.has(item.planId)) continue;
      seenPlans.add(item.planId);
    }
    views.push(purposeView(item, snapshot));
  }
  return views;
}

/** Purposes sharing a name — the symptom of the duplicated-plan bug. */
export function duplicatePurposeNames(ruleItems: AllocationRuleItem[]): string[] {
  const counts = new Map<string, number>();
  for (const item of ruleItems) {
    if (item.archived) continue;
    const key = item.name.trim().toLocaleLowerCase("pt-PT");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
}
