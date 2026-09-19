/**
 * ONE-TIME migration from the old fixed-wallet architecture.
 *
 * The app used to seed every profile with a fixed split — Construção 40 /
 * Objetivos 20 / Vida 20 / Família 10 / Livre 10 — and treated those buckets as
 * mandatory. They were a system assumption, never the person's decision.
 *
 * Rules, in order of importance:
 *  - Real money is never deleted. A legacy bucket that holds money or is
 *    referenced by a movement stays, as an ordinary purpose the person owns.
 *  - Untouched legacy buckets disappear: they only ever existed as defaults.
 *  - Percentages leave purposes entirely. Percentages belong to Strategy.
 *  - A plan and its money become one identity, so "Turquia" stops appearing
 *    twice.
 */
import type { Transaction } from "./ledger-types";
import type { AllocationRuleItem } from "./types";
import { purposeSourceOf } from "./purposes";

const LEGACY_DEFAULTS: Record<string, string> = {
  r1: "Construção",
  r2: "Objetivos",
  r3: "Vida",
  r4: "Família",
  r5: "Livre",
};

export interface MigrationPlanInput {
  id: string;
  name: string;
  walletId?: string | undefined;
}

export interface MoneyMigrationResult {
  /** Null when nothing had to change. */
  ruleItems: AllocationRuleItem[] | null;
  /** Plans that should be linked to an existing purpose instead of a new one. */
  planLinks: { planId: string; walletId: string }[];
  /** Plain-language record of what the migration did. */
  notes: string[];
}

function isReferenced(item: AllocationRuleItem, transactions: Transaction[]): boolean {
  return transactions.some(
    (tx) =>
      tx.bucketId === item.id ||
      tx.fromBucketId === item.id ||
      tx.toBucketId === item.id ||
      (tx.allocations ?? []).some((a) => a.bucketId === item.id),
  );
}

export function migrateMoneyModel({
  ruleItems,
  transactions,
  plans,
}: {
  ruleItems: AllocationRuleItem[];
  transactions: Transaction[];
  plans: MigrationPlanInput[];
}): MoneyMigrationResult {
  const notes: string[] = [];
  const planLinks: { planId: string; walletId: string }[] = [];
  let changed = false;

  // 1. Drop untouched legacy defaults, keep the ones holding real history.
  let next = ruleItems.filter((item) => {
    const legacyName = LEGACY_DEFAULTS[item.id];
    if (!legacyName || item.name !== legacyName) return true;
    if (isReferenced(item, transactions)) {
      notes.push(`"${item.name}" foi mantido porque tem movimentos reais.`);
      return true;
    }
    changed = true;
    notes.push(`"${item.name}" foi removido: nunca foi usado.`);
    return false;
  });

  // 2. One plan, one purpose.
  const byId = new Map(next.map((item) => [item.id, item]));
  const claimed = new Set<string>();
  for (const plan of plans) {
    const linked = plan.walletId ? byId.get(plan.walletId) : undefined;
    if (linked) {
      claimed.add(linked.id);
      if (linked.planId !== plan.id) changed = true;
      continue;
    }
    const match = next.find(
      (item) =>
        !item.archived &&
        !claimed.has(item.id) &&
        !item.planId &&
        item.kind === "goals" &&
        item.name.trim().toLocaleLowerCase("pt-PT") === plan.name.trim().toLocaleLowerCase("pt-PT"),
    );
    if (match) {
      claimed.add(match.id);
      planLinks.push({ planId: plan.id, walletId: match.id });
      changed = true;
      notes.push(`"${match.name}" passou a ser o dinheiro do plano com o mesmo nome.`);
    }
  }

  const planByWallet = new Map<string, string>();
  for (const plan of plans) if (plan.walletId) planByWallet.set(plan.walletId, plan.id);
  for (const link of planLinks) planByWallet.set(link.walletId, link.planId);

  // 3. Purposes stop carrying percentages and start declaring where they came from.
  next = next.map((item) => {
    const planId = planByWallet.get(item.id);
    const legacy = LEGACY_DEFAULTS[item.id] === item.name;
    const source = legacy ? "legacy" : planId ? "plan" : purposeSourceOf(item);
    const patched: AllocationRuleItem = {
      ...item,
      percentage: 0,
      source,
      ...(planId ? { planId } : {}),
    };
    if (item.percentage !== 0 || item.source !== source || item.planId !== patched.planId) {
      changed = true;
    }
    return patched;
  });

  return { ruleItems: changed ? next : null, planLinks, notes };
}
