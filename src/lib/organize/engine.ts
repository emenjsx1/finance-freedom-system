/**
 * Deterministic organisation engine.
 *
 * It produces OPTIONS, never an answer. No option is "the best one": each is a
 * different balance between protection, plans and flexibility, and every number
 * comes from money that already exists.
 *
 * Invariants enforced here:
 *  - the sum of every line always equals the total being organised;
 *  - no line is negative;
 *  - the person's hard constraints (protection floor, minimum available) win
 *    over any generated preference.
 */
import { monthsBetween } from "@/lib/personal/engine";

import type {
  AllocationCheck,
  FundingMapEntry,
  OrganizeDraft,
  OrganizePlanInput,
  OrganizeScenario,
  ScenarioLine,
} from "./types";

/** Round to whole currency units so scenarios never show cents. */
function roundUnit(minor: number): number {
  return Math.max(0, Math.round(minor / 100) * 100);
}

interface Variant {
  id: string;
  title: string;
  subtitle: string;
  /** Applied to the protection the person asked for. */
  protectionFactor: number;
  /** Used when the person does not know how much to protect. */
  protectionShare: number;
  /** Scales how much of the remaining money goes to plans. */
  planShare: number;
  /** Extra weight for the plan with the nearest date. */
  nearestBoost: number;
}

const VARIANTS: Variant[] = [
  {
    id: "safety",
    title: "Mais proteção",
    subtitle: "Guarda mais, avança devagar nos planos.",
    protectionFactor: 1,
    protectionShare: 0.5,
    planShare: 0.45,
    nearestBoost: 1,
  },
  {
    id: "balanced",
    title: "Equilíbrio",
    subtitle: "Divide entre proteção, planos e liberdade.",
    protectionFactor: 0.85,
    protectionShare: 0.35,
    planShare: 0.7,
    nearestBoost: 1.2,
  },
  {
    id: "plans",
    title: "Foco no plano mais próximo",
    subtitle: "Leva mais dinheiro para o que está mais perto.",
    protectionFactor: 0.8,
    protectionShare: 0.25,
    planShare: 0.9,
    nearestBoost: 1.8,
  },
];

function planWeight(plan: OrganizePlanInput, nearestId: string | null, boost: number, now: Date): number {
  const priority = plan.priority === "now" ? 3 : plan.priority === "important" ? 2 : 1;
  let dateFactor = 1;
  if (plan.targetDate) {
    const months = monthsBetween(now, new Date(plan.targetDate));
    if (months <= 3) dateFactor = 2;
    else if (months <= 6) dateFactor = 1.5;
    else if (months <= 12) dateFactor = 1.2;
  }
  const isNearest = nearestId !== null && (plan.planId ?? plan.name) === nearestId;
  return priority * dateFactor * (isNearest ? boost : 1);
}

/** The plan whose target date arrives first. Nothing is prioritised secretly. */
export function nearestPlan(plans: OrganizePlanInput[]): OrganizePlanInput | null {
  const dated = plans.filter((p) => p.include && p.targetDate);
  if (dated.length === 0) return null;
  return [...dated].sort((a, b) => (a.targetDate ?? "").localeCompare(b.targetDate ?? ""))[0] ?? null;
}

function remainingNeed(plan: OrganizePlanInput): number | null {
  if (plan.targetMinor === undefined) return null;
  return Math.max(0, plan.targetMinor - plan.reservedMinor);
}

function buildScenario(draft: OrganizeDraft, variant: Variant, now: Date): OrganizeScenario {
  const total = Math.max(0, draft.totalMinor);
  const plans = draft.plans.filter((p) => p.include);

  // 1. Protection — a floor the person asked for, or a share when unsure.
  let protection = 0;
  if (draft.protection === "amount" && draft.protectionMinor) {
    protection = roundUnit(draft.protectionMinor * variant.protectionFactor);
  } else if (draft.protection === "unsure") {
    protection = roundUnit(total * variant.protectionShare);
  }
  protection = Math.min(protection, total);

  // 2. Hard constraints: known commitments and the minimum available.
  const commitments = draft.reserveCommitments ? Math.min(draft.commitmentsMonthlyMinor, total) : 0;
  const floor = Math.min(draft.minAvailableMinor, total);

  let room = total - protection - commitments - floor;
  if (room < 0) {
    // Protection gives way before the person's own floor does.
    protection = Math.max(0, protection + room);
    room = Math.max(0, total - protection - commitments - floor);
  }

  // 3. Plans share the remaining room by priority and by how close they are.
  const nearest = nearestPlan(plans);
  const nearestId = nearest ? (nearest.planId ?? nearest.name) : null;
  const weights = plans.map((plan) => ({
    plan,
    weight: planWeight(plan, nearestId, variant.nearestBoost, now),
  }));
  const weightSum = weights.reduce((sum, w) => sum + w.weight, 0);
  const planBudget = roundUnit(room * variant.planShare);

  const planLines: ScenarioLine[] = [];
  let planned = 0;
  for (const { plan, weight } of weights) {
    if (weightSum === 0) break;
    let amount = roundUnit((planBudget * weight) / weightSum);
    const need = remainingNeed(plan);
    if (need !== null) amount = Math.min(amount, roundUnit(need));
    amount = Math.min(amount, Math.max(0, planBudget - planned));
    if (amount <= 0) continue;
    planned += amount;
    planLines.push({
      key: `plan:${plan.planId ?? plan.name}`,
      label: plan.name,
      kind: "plan",
      amountMinor: amount,
      planId: plan.planId,
      planName: plan.name,
    });
  }

  // 4. Whatever is left stays available — money is never invented or lost.
  const available = total - protection - commitments - planned;

  const lines: ScenarioLine[] = [];
  if (protection > 0) {
    lines.push({ key: "protected", label: "Protegido", kind: "protected", amountMinor: protection });
  }
  if (commitments > 0) {
    lines.push({
      key: "commitments",
      label: "Compromissos do mês",
      kind: "commitments",
      amountMinor: commitments,
    });
  }
  lines.push(...planLines);
  lines.push({ key: "available", label: "Disponível", kind: "available", amountMinor: available });

  const notes: string[] = [];
  if (protection > 0) notes.push(`Mantém ${short(protection)} fora do dinheiro do dia a dia.`);
  if (planLines.length > 0 && nearest) {
    notes.push(
      `${nearest.name} tem a data mais próxima, por isso recebe mais nesta opção.`,
    );
  }
  if (planLines.length === 0) notes.push("Nenhum plano recebe dinheiro nesta opção.");
  notes.push(`Ficam ${short(available)} disponíveis para o dia a dia.`);
  if (commitments > 0) {
    notes.push(`${short(commitments)} ficam reservados para os compromissos que já conheces.`);
  }

  return {
    id: variant.id,
    title: variant.title,
    subtitle: variant.subtitle,
    lines,
    totalMinor: lines.reduce((sum, line) => sum + line.amountMinor, 0),
    notes,
  };
}

function short(minor: number): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(minor / 100);
}

/** Two or three ways to organise the same money. Order follows the preference only. */
export function generateScenarios(draft: OrganizeDraft, now = new Date()): OrganizeScenario[] {
  const scenarios = VARIANTS.map((variant) => buildScenario(draft, variant, now));
  const preferred = draft.flexibility === "custom" ? "balanced" : draft.flexibility;
  return [...scenarios].sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred));
}

/** Allocations may never exceed the money that actually exists. */
export function checkAllocation(lines: ScenarioLine[], totalMinor: number): AllocationCheck {
  const allocated = lines.reduce((sum, line) => sum + line.amountMinor, 0);
  return {
    allocatedMinor: allocated,
    totalMinor,
    overByMinor: Math.max(0, allocated - totalMinor),
    ok: allocated <= totalMinor,
  };
}

/**
 * Where each reservation physically sits today.
 *
 * This is a reading of existing account balances, not a transfer: the accounts
 * keep exactly the same money after an organisation is applied.
 */
export function fundingMap(
  lines: ScenarioLine[],
  accounts: Array<{ id: string; name: string; balanceMinor: number }>,
): FundingMapEntry[] {
  const pool = accounts
    .filter((account) => account.balanceMinor > 0)
    .sort((a, b) => b.balanceMinor - a.balanceMinor)
    .map((account) => ({ ...account, left: account.balanceMinor }));

  return lines
    .filter((line) => line.kind !== "available")
    .map((line) => {
      let left = line.amountMinor;
      const from = [] as FundingMapEntry["from"];
      for (const account of pool) {
        if (left <= 0) break;
        if (account.left <= 0) continue;
        const take = Math.min(account.left, left);
        account.left -= take;
        left -= take;
        from.push({ accountId: account.id, accountName: account.name, amountMinor: take });
      }
      return { key: line.key, label: line.label, amountMinor: line.amountMinor, from };
    });
}

/** Plans asking for more than the money that exists — stated, never hidden. */
export function unfundedNeed(plans: OrganizePlanInput[], organisedMinor: Record<string, number>): number {
  return plans
    .filter((plan) => plan.include)
    .reduce((sum, plan) => {
      const need = remainingNeed(plan);
      if (need === null) return sum;
      const given = organisedMinor[`plan:${plan.planId ?? plan.name}`] ?? 0;
      return sum + Math.max(0, need - given);
    }, 0);
}
