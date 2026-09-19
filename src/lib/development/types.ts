/**
 * Personal Development domain.
 *
 * This sits beside — never inside — the financial domain:
 *   MONEY        — deterministic engine (src/lib/finance). Strict.
 *   PLANS        — what the person wants (src/lib/personal/types.ts). Shared.
 *   DEVELOPMENT  — how they work on it over time (this file). Flexible.
 *
 * Nothing here holds, moves or calculates money. A Program or an Action may
 * point at a Plan, and that Plan may be financial, but the amounts always come
 * from the financial engine.
 *
 * There are no scores here on purpose: no life score, no discipline score, no
 * streaks. Only facts the person created or confirmed.
 */

/* --------------------------------- actions -------------------------------- */

/** Human wording instead of P1/P2/P3. */
export type ActionPriority = "now" | "important" | "later";

export const ACTION_PRIORITY_LABELS: Record<ActionPriority, string> = {
  now: "Agora",
  important: "Importante",
  later: "Depois",
};

/** A missed action is never "failed". It is simply still pending. */
export type ActionStatus = "pending" | "done" | "skipped";

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pending: "Por fazer",
  done: "Feita",
  skipped: "Deixada de lado",
};

export type PersonalSource = "user" | "agent_confirmed";

export const SOURCE_LABELS: Record<PersonalSource, string> = {
  user: "Criado por ti",
  agent_confirmed: "Confirmado na conversa",
};

export interface PersonalAction {
  id: string;
  title: string;
  notes?: string | undefined;
  status: ActionStatus;
  priority: ActionPriority;
  /** YYYY-MM-DD in the person's own day, or undefined for "sem data". */
  scheduledDate?: string | undefined;
  /** HH:MM, local. Scheduling is timezone-aware at the notification layer. */
  scheduledTime?: string | undefined;
  /** A reminder is a notification about the action, not the action itself. */
  reminder: boolean;
  planId?: string | undefined;
  programId?: string | undefined;
  programItemId?: string | undefined;
  source: PersonalSource;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | undefined;
}

/* -------------------------------- programs -------------------------------- */

/**
 * A Program is a structured, temporary path. A Plan is the outcome; a Program
 * is the work. One may exist without the other.
 */
export type ProgramItemType = "action" | "reflection" | "checkin" | "review" | "milestone";

export const PROGRAM_ITEM_TYPE_LABELS: Record<ProgramItemType, string> = {
  action: "Ação",
  reflection: "Reflexão",
  checkin: "Ponto de situação",
  review: "Revisão",
  milestone: "Marco",
};

export interface ProgramItem {
  id: string;
  type: ProgramItemType;
  title: string;
  description?: string | undefined;
  /** Day number within the program, starting at 1. */
  day: number;
  scheduledDate?: string | undefined;
  scheduledTime?: string | undefined;
  status: ActionStatus;
  reminder: boolean;
  order: number;
}

export type ProgramStatus = "draft" | "active" | "paused" | "completed" | "cancelled";

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: "Rascunho",
  active: "A decorrer",
  paused: "Em pausa",
  completed: "Terminado",
  cancelled: "Cancelado",
};

export interface Program {
  id: string;
  title: string;
  purpose?: string | undefined;
  status: ProgramStatus;
  /** YYYY-MM-DD. */
  startDate: string;
  durationDays: number;
  planId?: string | undefined;
  items: ProgramItem[];
  source: PersonalSource;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | undefined;
}

/** Duration is a choice, not a game. */
export const PROGRAM_DURATIONS = [3, 7, 14, 30, 90] as const;

/* -------------------------------- decisions -------------------------------- */

export type DecisionStatus = "active" | "revisit" | "changed";

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  active: "Em vigor",
  revisit: "A rever",
  changed: "Mudei de ideias",
};

export interface Decision {
  id: string;
  statement: string;
  reason?: string | undefined;
  /** YYYY-MM-DD. */
  date: string;
  planId?: string | undefined;
  status: DecisionStatus;
  source: PersonalSource;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------- evolution -------------------------------- */

/**
 * Evolution is a timeline of real, user-approved changes. It is written only
 * when something actually happened — never predicted, never inferred.
 */
export type EvolutionKind =
  | "plan_created"
  | "plan_completed"
  | "direction_added"
  | "program_created"
  | "program_completed"
  | "action_completed"
  | "decision_recorded"
  | "context_saved"
  | "money_organised";

export const EVOLUTION_KIND_LABELS: Record<EvolutionKind, string> = {
  plan_created: "Plano criado",
  plan_completed: "Plano concluído",
  direction_added: "Direção",
  program_created: "Programa começado",
  program_completed: "Programa terminado",
  action_completed: "Ação concluída",
  decision_recorded: "Decisão registada",
  context_saved: "Contexto guardado",
  money_organised: "Dinheiro organizado",
};

export interface EvolutionEvent {
  id: string;
  kind: EvolutionKind;
  title: string;
  detail?: string | undefined;
  at: string;
  /** The person can hide an entry without deleting their own history. */
  hidden?: boolean | undefined;
}

/* --------------------------- reflections & reviews -------------------------- */

/** Optional. Journaling is never forced and can be turned off entirely. */
export interface Reflection {
  id: string;
  /** YYYY-MM-DD. */
  date: string;
  prompt?: string | undefined;
  content: string;
  programId?: string | undefined;
  createdAt: string;
}

export interface DevelopmentState {
  programs: Program[];
  actions: PersonalAction[];
  decisions: Decision[];
  evolution: EvolutionEvent[];
  reflections: Reflection[];
  /** Daily reflection is opt-in. */
  dailyReflectionEnabled: boolean;
}

export const EMPTY_DEVELOPMENT_STATE: DevelopmentState = {
  programs: [],
  actions: [],
  decisions: [],
  evolution: [],
  reflections: [],
  dailyReflectionEnabled: false,
};
