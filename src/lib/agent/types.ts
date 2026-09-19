/**
 * Agent domain model.
 *
 * Three things are deliberately separate and never mixed:
 *  - PERSONAL MEMORY  — what matters to the user (user-provided, inspectable)
 *  - FINANCIAL LEDGER — what actually happened (owned by the engine)
 *  - CONVERSATIONS    — what was discussed
 * The model never mutates money: it may only PREPARE an action that the user
 * confirms and the financial engine executes.
 */

export type MemoryCategory =
  | "goals"
  | "life"
  | "work"
  | "family"
  | "preferences"
  | "plans"
  | "philosophy"
  | "other";

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  goals: "Objetivos",
  life: "Vida",
  work: "Trabalho",
  family: "Família",
  preferences: "Preferências",
  plans: "Planos",
  philosophy: "Filosofia financeira",
  other: "Outro",
};

export interface Memory {
  id: string;
  category: MemoryCategory;
  content: string;
  createdAt: string;
  source: "user" | "agent_confirmed";
}

export interface AgentProfile {
  preferredName: string;
  context: string;
  focus: string;
  priorities: string;
  onboarded: boolean;
}

export const EMPTY_PROFILE: AgentProfile = {
  preferredName: "",
  context: "",
  focus: "",
  priorities: "",
  onboarded: false,
};

export const FOCUS_OPTIONS = [
  "Organizar o dinheiro",
  "Construir património",
  "Reduzir gastos",
  "Poupar para objetivos",
  "Planear a vida",
  "Negócio",
  "Outro",
];

export type PreparedActionType =
  | "expense"
  | "income"
  | "transfer"
  | "reallocation"
  | "goal_suggestion";

export interface PreparedAction {
  type: PreparedActionType;
  amountMinor: number;
  categoryId?: string;
  accountId?: string;
  bucketId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  fromBucketId?: string;
  toBucketId?: string;
  merchant?: string;
  note?: string;
  /** Plain-language summary written by the agent. */
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: string;
  /** Present only on agent messages that prepared an action. */
  action?: PreparedAction;
  actionStatus?: "pending" | "confirmed" | "cancelled";
  failed?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

/** Auditable record of every action the agent prepared. */
export interface AgentAuditEntry {
  id: string;
  conversationId: string;
  createdAt: string;
  actionType: PreparedActionType;
  proposed: PreparedAction;
  status: "prepared" | "confirmed" | "cancelled";
  resultTransactionId?: string;
}

export interface AgentState {
  conversations: Conversation[];
  memories: Memory[];
  profile: AgentProfile;
  audit: AgentAuditEntry[];
}

export const EMPTY_AGENT_STATE: AgentState = {
  conversations: [],
  memories: [],
  profile: EMPTY_PROFILE,
  audit: [],
};

export const AGENT_SUGGESTIONS = [
  "Como estou este mês?",
  "Quanto posso gastar?",
  "Onde estou a gastar mais?",
  "Resume a minha semana.",
  "Ajuda-me a organizar o próximo mês.",
];
