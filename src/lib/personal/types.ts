/**
 * Personal OS domain contracts.
 *
 * Four concepts stay separate on purpose and must never be merged:
 *   ACCOUNTS  — where money physically exists (src/lib/finance).
 *   PLANS     — what the person wants to achieve (this file).
 *   STRATEGY  — how NEW money is organised (this file).
 *   CONTEXT   — what the system knows, with permission (this file).
 *
 * Financial truth always comes from the deterministic engine. Nothing here
 * calculates balances; plans only reference the purpose wallet that holds the
 * reserved money.
 */

import { EMPTY_DEVELOPMENT_STATE, type DevelopmentState } from "@/lib/development/types";

export type PlanType =
  | "travel"
  | "purchase"
  | "home"
  | "car"
  | "education"
  | "business"
  | "emergency"
  | "personal"
  | "career"
  | "family"
  | "health"
  | "custom";

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  travel: "Viagem",
  purchase: "Compra",
  home: "Casa",
  car: "Carro",
  education: "Educação",
  business: "Negócio",
  emergency: "Reserva",
  personal: "Pessoal",
  career: "Carreira",
  family: "Família",
  health: "Saúde",
  custom: "Outro",
};

/** Symbol keys from src/lib/icons/symbols — never emoji. */
export const PLAN_TYPE_SYMBOL: Record<PlanType, string> = {
  travel: "travel",
  purchase: "card",
  home: "home",
  car: "car",
  education: "education",
  business: "briefcase",
  emergency: "protected",
  personal: "star",
  career: "target",
  family: "family",
  health: "health",
  custom: "sparkle",
};

/** "Idea" matters: wanting something is not the same as committing to it. */
export type PlanStatus = "idea" | "active" | "paused" | "completed" | "archived";

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  idea: "Ideia",
  active: "Ativo",
  paused: "Em pausa",
  completed: "Concluído",
  archived: "Arquivado",
};

/** Human wording instead of High/Normal/Low. */
export type PlanPriority = "now" | "important" | "later";

export const PLAN_PRIORITY_LABELS: Record<PlanPriority, string> = {
  now: "Agora",
  important: "Importante",
  later: "Depois",
};

export type FundingStrategy =
  | "manual"
  | "fixed_monthly"
  | "percentage_of_income"
  | "priority"
  | "surplus_only"
  | "custom";

export const FUNDING_STRATEGY_LABELS: Record<FundingStrategy, string> = {
  manual: "Eu decido quando guardar",
  fixed_monthly: "Guardar um valor fixo por mês",
  percentage_of_income: "Guardar uma percentagem do que entra",
  priority: "Dar prioridade a este plano",
  surplus_only: "Usar apenas dinheiro excedente",
  custom: "Estratégia própria",
};

export interface PlanMilestone {
  id: string;
  title: string;
  done: boolean;
  doneAt?: string | undefined;
}

export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  status: PlanStatus;
  priority: PlanPriority;
  description?: string | undefined;
  /** A plan is financial only when the person says so. */
  financial: boolean;
  targetMinor?: number | undefined;
  targetDate?: string | undefined;
  funding?: FundingStrategy | undefined;
  /** Percentage or fixed amount that supports the chosen funding strategy. */
  fundingValue?: number | undefined;
  /** The purpose wallet (AllocationRuleItem id) that physically holds the money. */
  walletId?: string | undefined;
  symbol?: string | undefined;
  coverImageUrl?: string | undefined;
  milestones: PlanMilestone[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Strategy — how new money is organised                               */
/* ------------------------------------------------------------------ */

export type RuleMethod = "percentage" | "fixed" | "priority" | "surplus";

export const RULE_METHOD_LABELS: Record<RuleMethod, string> = {
  percentage: "Percentagem do que entra",
  fixed: "Valor fixo",
  priority: "Por prioridade",
  surplus: "Só o excedente",
};

export type RuleTargetKind = "plan" | "wallet" | "protection" | "available";

export interface StrategyRule {
  id: string;
  label: string;
  method: RuleMethod;
  /** percentage: 0-100. fixed/surplus: minor units. priority: order only. */
  value: number;
  targetKind: RuleTargetKind;
  /** Plan id or wallet id, depending on targetKind. */
  targetId?: string | undefined;
  /** Priority rules stop once the target holds this much. */
  untilMinor?: number | undefined;
  order: number;
  enabled: boolean;
}

/**
 * How a strategy behaves when new money arrives.
 * No strategy at all is represented by `strategy: null`, never by a mode.
 * - manual: organises nothing on its own; only when the person asks.
 * - suggest: offers a suggestion after an income is recorded.
 * - automatic: applies the configured organisation, explicit opt-in only.
 * - paused: keeps the rules but organises nothing for now.
 */
export type StrategyMode = "none" | "manual" | "suggest" | "automatic" | "paused";

export interface Strategy {
  id: string;
  /** Template key, or "custom" / "legacy". */
  templateKey: string;
  name: string;
  description: string;
  /** Suggesting is the default; automation is always an explicit choice. */
  mode: StrategyMode;
  rules: StrategyRule[];
  /** Surplus strategies keep this much available before organising anything. */
  keepAvailableMinor?: number | undefined;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Personal context — only what the person approved                    */
/* ------------------------------------------------------------------ */

export type ContextCategory =
  | "about"
  | "plans"
  | "priorities"
  | "preferences"
  | "work"
  | "money"
  | "important";

export const CONTEXT_CATEGORY_LABELS: Record<ContextCategory, string> = {
  about: "Sobre mim",
  plans: "Planos",
  priorities: "Prioridades",
  preferences: "Preferências",
  work: "Trabalho",
  money: "Preferências financeiras",
  important: "Contexto importante",
};

export type ContextSource = "user" | "agent_confirmed" | "app";

export const CONTEXT_SOURCE_LABELS: Record<ContextSource, string> = {
  user: "Escrito por ti",
  agent_confirmed: "Confirmado na conversa",
  app: "Dados da aplicação",
};

/** Context ages: a plan from two years ago is not automatically still true. */
export type ContextState = "active" | "outdated" | "archived";

export interface PersonalContextItem {
  id: string;
  category: ContextCategory;
  content: string;
  source: ContextSource;
  state: ContextState;
  createdAt: string;
  updatedAt: string;
  /** Set when the person last confirmed the item is still true. */
  reviewedAt?: string | undefined;
}

/* ------------------------------------------------------------------ */
/* Direction — lightweight, never generated by the system              */
/* ------------------------------------------------------------------ */

export type DirectionHorizon = "now" | "next" | "later" | "exploring";

export const DIRECTION_HORIZON_LABELS: Record<DirectionHorizon, string> = {
  now: "Agora",
  next: "Próximos 12 meses",
  later: "Mais tarde",
  exploring: "Ainda estou a descobrir",
};

export interface DirectionItem {
  id: string;
  horizon: DirectionHorizon;
  content: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Commitments — expected money, not spent money                       */
/* ------------------------------------------------------------------ */

export type CommitmentCadence = "monthly" | "weekly" | "yearly" | "once";

export const COMMITMENT_CADENCE_LABELS: Record<CommitmentCadence, string> = {
  monthly: "Todos os meses",
  weekly: "Todas as semanas",
  yearly: "Todos os anos",
  once: "Uma vez",
};

export interface Commitment {
  id: string;
  name: string;
  amountMinor: number;
  cadence: CommitmentCadence;
  /** Day of month (1-31) for monthly commitments. */
  dueDay?: number | undefined;
  accountId?: string | undefined;
  /** A commitment only becomes an expense when it is actually paid. */
  active: boolean;
  createdAt: string;
}

/** Permission boundaries for what the Agent may read. */
export interface AgentPermissions {
  financial: boolean;
  plans: boolean;
  personalContext: boolean;
  documents: boolean;
}

export const DEFAULT_AGENT_PERMISSIONS: AgentPermissions = {
  financial: true,
  plans: true,
  personalContext: true,
  documents: false,
};

/** Everything the Personal OS stores outside the ledger. */
export interface PersonalState {
  /** One short line the person writes about themselves. Never generated. */
  headline?: string | undefined;
  direction: DirectionItem[];
  plans: Plan[];
  strategy: Strategy | null;
  context: PersonalContextItem[];
  commitments: Commitment[];
  permissions: AgentPermissions;
  /**
   * Personal development: programs, actions, decisions and the evolution
   * timeline. Kept in the same record because a Plan is shared by both sides,
   * but the two domains never merge: money stays strict, development stays
   * flexible.
   */
  development: DevelopmentState;
  /** Set once the legacy fixed-wallet rule was converted into a strategy. */
  legacyMigratedAt?: string | undefined;
}

export const EMPTY_PERSONAL_STATE: PersonalState = {
  direction: [],
  plans: [],
  strategy: null,
  context: [],
  commitments: [],
  permissions: DEFAULT_AGENT_PERMISSIONS,
  development: EMPTY_DEVELOPMENT_STATE,
};
