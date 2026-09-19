/**
 * Automations: WHEN → IF → THEN.
 *
 * Two action levels exist and never blur:
 *  - SAFE      — notify, create a reminder, prepare a review.
 *  - FINANCIAL — moves money, and always needs an explicit confirmation.
 *
 * Core financial behaviour (the allocation rule applied to new income) is not
 * rebuilt here; automations only add optional behaviour on top.
 */

export type AutomationTriggerKind =
  | "schedule_daily"
  | "schedule_weekly"
  | "schedule_monthly"
  | "income_recorded"
  | "wallet_below_threshold"
  | "account_below_threshold"
  | "unallocated_money"
  | "upcoming_payment"
  | "goal_contribution_due";

export type AutomationActionKind =
  | "notify"
  | "generate_review"
  | "create_reminder"
  | "prepare_contribution"
  | "prepare_payment";

/** Actions that can move money. Always confirmed by the user first. */
export const FINANCIAL_ACTIONS: AutomationActionKind[] = ["prepare_contribution", "prepare_payment"];

export interface AutomationTrigger {
  kind: AutomationTriggerKind;
  /** Schedule triggers. */
  time?: string;
  weekday?: number;
  day?: number;
  /** Entity the trigger watches. */
  walletId?: string;
  accountId?: string;
}

export interface AutomationCondition {
  /** Only act above this amount. */
  minAmountMinor?: number;
  /** Threshold for balance triggers. */
  thresholdMinor?: number;
  /** Days before a payment is due. */
  daysBefore?: number;
}

export interface AutomationAction {
  kind: AutomationActionKind;
  /** Message used by `notify`. Facts are appended by the rules layer. */
  message?: string;
  amountMinor?: number;
  walletId?: string;
  review?: "weekly" | "monthly" | "daily";
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  condition: AutomationCondition;
  action: AutomationAction;
  createdAt: string;
  lastRunAt?: string | undefined;
  /** Set for the rules installed from a template, so they can be recognised. */
  templateId?: string | undefined;
}

export type AutomationOutcome = "completed" | "notified" | "prepared" | "skipped" | "failed";

export interface AutomationRun {
  id: string;
  automationId: string;
  automationName: string;
  at: string;
  outcome: AutomationOutcome;
  /** Short, human wording. Technical detail stays out of the user's way. */
  detail: string;
  /** Kept for retries; never shown as-is. */
  error?: string | undefined;
  attempts: number;
}

export const OUTCOME_LABELS: Record<AutomationOutcome, string> = {
  completed: "Concluída",
  notified: "Notificação enviada",
  prepared: "Ação preparada",
  skipped: "Sem ação necessária",
  failed: "Não foi possível concluir",
};

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  condition: AutomationCondition;
  action: AutomationAction;
  /** Installed for every new user. */
  defaultEnabled: boolean;
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "weekly_review",
    name: "Resumo semanal",
    description: "Todos os domingos, preparar o resumo da semana.",
    trigger: { kind: "schedule_weekly", weekday: 0, time: "18:00" },
    condition: {},
    action: { kind: "generate_review", review: "weekly" },
    defaultEnabled: true,
  },
  {
    id: "monthly_review",
    name: "Fecho do mês",
    description: "No primeiro dia do mês, preparar o fecho do mês anterior.",
    trigger: { kind: "schedule_monthly", day: 1, time: "09:00" },
    condition: {},
    action: { kind: "generate_review", review: "monthly" },
    defaultEnabled: true,
  },
  {
    id: "upcoming_payment",
    name: "Lembrete de pagamento",
    description: "Avisar antes de um pagamento recorrente vencer.",
    trigger: { kind: "upcoming_payment" },
    condition: { daysBefore: 3 },
    action: { kind: "notify" },
    defaultEnabled: true,
  },
  {
    id: "unallocated_money",
    name: "Dinheiro sem propósito",
    description: "Lembrar quando fica dinheiro por distribuir.",
    trigger: { kind: "unallocated_money" },
    condition: { minAmountMinor: 50_00 },
    action: { kind: "notify" },
    defaultEnabled: true,
  },
  {
    id: "goal_contribution",
    name: "Contribuição para objetivo",
    description: "Lembrar a contribuição mensal planeada e preparar o valor.",
    trigger: { kind: "goal_contribution_due" },
    condition: {},
    action: { kind: "prepare_contribution" },
    defaultEnabled: false,
  },
  {
    id: "wallet_below",
    name: "Carteira abaixo do limite",
    description: "Avisar quando uma carteira fica abaixo do limite que definiste.",
    trigger: { kind: "wallet_below_threshold" },
    condition: {},
    action: { kind: "notify" },
    defaultEnabled: true,
  },
  {
    id: "account_below",
    name: "Conta abaixo do limite",
    description: "Avisar quando uma conta fica abaixo do limite que definiste.",
    trigger: { kind: "account_below_threshold" },
    condition: {},
    action: { kind: "notify" },
    defaultEnabled: true,
  },
];

export const TRIGGER_LABELS: Record<AutomationTriggerKind, string> = {
  schedule_daily: "Todos os dias",
  schedule_weekly: "Todas as semanas",
  schedule_monthly: "Todos os meses",
  income_recorded: "Quando registo uma entrada",
  wallet_below_threshold: "Quando uma carteira fica abaixo do limite",
  account_below_threshold: "Quando uma conta fica abaixo do limite",
  unallocated_money: "Quando fica dinheiro sem propósito",
  upcoming_payment: "Quando um pagamento se aproxima",
  goal_contribution_due: "Quando uma contribuição planeada está por fazer",
};

export const ACTION_LABELS: Record<AutomationActionKind, string> = {
  notify: "Notificar-me",
  generate_review: "Preparar resumo",
  create_reminder: "Criar lembrete",
  prepare_contribution: "Preparar contribuição (com confirmação)",
  prepare_payment: "Preparar pagamento (com confirmação)",
};
