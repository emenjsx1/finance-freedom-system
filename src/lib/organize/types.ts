/**
 * "Ajuda-me a organizar" — domain contracts.
 *
 * This organises money that ALREADY EXISTS. How FUTURE money is organised is
 * the Strategy domain and stays separate.
 *
 * Nothing here moves physical money: an organisation only changes the PURPOSE
 * classification of money that is already in the person's accounts.
 */
import type { PlanPriority } from "@/lib/personal/types";

export type ProtectionAnswer = "amount" | "unsure" | "none";
export type IncomeShape = "regular" | "variable" | "irregular" | "unsure";
export type MoneyOwnership = "personal" | "business" | "mixed" | "unsure";
/** Preference directions, never a personality diagnosis. */
export type FlexibilityChoice = "safety" | "balanced" | "plans" | "custom";

export const INCOME_SHAPE_LABELS: Record<IncomeShape, string> = {
  regular: "Entra de forma regular",
  variable: "Varia de mês para mês",
  irregular: "É muito irregular",
  unsure: "Ainda não sei",
};

export const FLEXIBILITY_LABELS: Record<FlexibilityChoice, string> = {
  safety: "Mais segurança",
  balanced: "Equilibrado",
  plans: "Mais foco nos planos",
  custom: "Personalizar",
};

export const FLEXIBILITY_HINTS: Record<FlexibilityChoice, string> = {
  safety: "Manter mais dinheiro protegido e disponível para imprevistos.",
  balanced: "Equilibrar liberdade e os planos que já tens.",
  plans: "Direcionar mais dinheiro para o que estás a construir.",
  custom: "Defines tu os limites.",
};

/** A plan considered by the organisation. Existing plans are reused, never recreated. */
export interface OrganizePlanInput {
  /** Existing Plan id when it already exists. */
  planId?: string | undefined;
  name: string;
  priority: PlanPriority;
  /** Undefined means the person does not know the cost yet — that is allowed. */
  targetMinor?: number | undefined;
  targetDate?: string | undefined;
  /** Already reserved for this plan today. */
  reservedMinor: number;
  include: boolean;
}

export interface OrganizeDraft {
  /** Money the engine found in the accounts. Never invented. */
  totalMinor: number;
  currencyCode: string;
  protection: ProtectionAnswer;
  protectionMinor?: number | undefined;
  protectionReason?: string | undefined;
  plans: OrganizePlanInput[];
  /** Monthly commitments already known to the system. */
  commitmentsMonthlyMinor: number;
  /** Explicitly reserve the known commitments inside this organisation. */
  reserveCommitments: boolean;
  income: IncomeShape;
  ownership: MoneyOwnership;
  flexibility: FlexibilityChoice;
  /** Hard constraint: never organise below this much available. */
  minAvailableMinor: number;
  updatedAt: string;
}

export type ScenarioLineKind = "protected" | "plan" | "commitments" | "available";

export interface ScenarioLine {
  key: string;
  label: string;
  kind: ScenarioLineKind;
  amountMinor: number;
  planId?: string | undefined;
  planName?: string | undefined;
}

export interface OrganizeScenario {
  id: string;
  title: string;
  subtitle: string;
  lines: ScenarioLine[];
  totalMinor: number;
  /** Short factual consequences. Never "the best option". */
  notes: string[];
}

export interface FundingLine {
  accountId: string;
  accountName: string;
  amountMinor: number;
}

export interface FundingMapEntry {
  key: string;
  label: string;
  amountMinor: number;
  from: FundingLine[];
}

export interface AllocationCheck {
  allocatedMinor: number;
  totalMinor: number;
  overByMinor: number;
  ok: boolean;
}
