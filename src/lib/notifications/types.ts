/**
 * Notification domain model (Phase 08).
 *
 * Every notification carries a TYPED payload — the meaning of an event is
 * never stored only as prose. Delivery is channel-agnostic: the service
 * produces notification events, channel adapters deliver them.
 *
 * Nothing here calculates money. Facts arrive already computed by the
 * financial engine and the Phase 07 analytics service.
 */

export type NotificationCategory =
  | "transactions"
  | "goals"
  | "upcoming"
  | "organization"
  | "protected"
  | "reports"
  | "agent"
  | "personal"
  | "reminders"
  | "system";

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  transactions: "Transações",
  goals: "Objetivos",
  upcoming: "Próximos pagamentos",
  organization: "Organização",
  protected: "Dinheiro protegido",
  reports: "Resumos",
  agent: "Agente",
  personal: "Pessoal",
  reminders: "Lembretes",
  system: "Sistema",
};

/** Filters shown in the notification centre. */
export type NotificationFilter = "unread" | "all" | "financial" | "goals" | "planning" | "agent";

export type Priority = "low" | "normal" | "high" | "security";

/** Preference keys. Each maps to one or more payload kinds. */
export type PrefKey =
  | "upcoming_payments"
  | "transaction_reminders"
  | "goal_reminders"
  | "goal_milestones"
  | "goal_deadlines"
  | "protected_money"
  | "unallocated_money"
  | "weekly_review"
  | "monthly_review"
  | "daily_brief"
  | "agent_insights"
  | "category_insights"
  | "large_expense"
  | "low_balance"
  | "personal_actions"
  | "program_checkins"
  | "agent_followups"
  | "reminders"
  | "security"
  | "system";

export const PREF_LABELS: Record<PrefKey, { label: string; description: string }> = {
  upcoming_payments: { label: "Próximos pagamentos", description: "Avisos antes de um pagamento recorrente." },
  transaction_reminders: { label: "Lembretes de registo", description: "Pagamentos que passaram da data sem confirmação." },
  goal_reminders: { label: "Contribuições planeadas", description: "Quando planeaste contribuir para um objetivo." },
  goal_milestones: { label: "Marcos de objetivos", description: "25%, 50%, 75% e objetivo financiado." },
  goal_deadlines: { label: "Datas de objetivos", description: "Quando a data definida se aproxima." },
  protected_money: { label: "Dinheiro protegido", description: "Retiradas de carteiras protegidas." },
  unallocated_money: { label: "Dinheiro sem propósito", description: "Quando fica dinheiro por distribuir." },
  weekly_review: { label: "Resumo semanal", description: "Como correu a semana." },
  monthly_review: { label: "Fecho do mês", description: "Resumo do mês anterior." },
  daily_brief: { label: "Resumo diário", description: "Um resumo curto de manhã." },
  agent_insights: { label: "Observações do Agente", description: "Factos relevantes calculados pela app." },
  category_insights: { label: "Variações por categoria", description: "Quando uma categoria muda de forma significativa." },
  large_expense: { label: "Despesas grandes", description: "Contexto depois de uma despesa fora do comum." },
  low_balance: { label: "Limites que definiste", description: "Carteiras e contas abaixo do teu limite." },
  security: { label: "Segurança", description: "Sessões, palavra-passe e definições sensíveis." },
  personal_actions: { label: "Ações pessoais", description: "Lembretes das ações que marcaste." },
  program_checkins: { label: "Programas", description: "Check-ins e fim de programa." },
  reminders: { label: "Lembretes", description: "Os lembretes que marcaste, à hora que escolheste." },
  agent_followups: { label: "Seguimentos do Agente", description: "Só quando pedes ao Agente para voltar ao assunto." },
  system: { label: "Sistema e produto", description: "Novidades e avisos da aplicação." },
};

export type Channel = "inApp" | "push" | "email";

export interface ChannelPrefs {
  inApp: boolean;
  push: boolean;
  email: boolean;
}

export type FrequencyPreset = "minimal" | "balanced" | "active" | "custom";

export const FREQUENCY_LABELS: Record<FrequencyPreset, { label: string; description: string }> = {
  minimal: { label: "Mínimo", description: "Apenas lembretes importantes e resumos." },
  balanced: { label: "Equilibrado", description: "Eventos importantes e resumos úteis." },
  active: { label: "Ativo", description: "Mais contexto financeiro." },
  custom: { label: "Personalizado", description: "Escolhes cada categoria." },
};

/** Frequency presets narrow what is allowed. They never widen a category the user turned off. */
export const FREQUENCY_ALLOWED: Record<Exclude<FrequencyPreset, "custom">, PrefKey[]> = {
  minimal: ["upcoming_payments", "goal_deadlines", "monthly_review", "security", "low_balance", "personal_actions", "reminders"],
  balanced: [
    "upcoming_payments",
    "transaction_reminders",
    "goal_reminders",
    "goal_milestones",
    "goal_deadlines",
    "protected_money",
    "unallocated_money",
    "weekly_review",
    "monthly_review",
    "daily_brief",
    "personal_actions",
    "program_checkins",
    "agent_followups",
    "reminders",
    "low_balance",
    "security",
    "system",
  ],
  active: Object.keys(PREF_LABELS) as PrefKey[],
};

export type BriefSection = "available" | "upcoming" | "goals" | "spending" | "unallocated";

export const BRIEF_SECTION_LABELS: Record<BriefSection, string> = {
  available: "Disponível para gastar",
  upcoming: "Próximos pagamentos",
  goals: "Objetivos",
  spending: "Gastos recentes",
  unallocated: "Dinheiro sem propósito",
};

/** How much a lock-screen preview may reveal. */
export type PreviewPrivacy = "details" | "hide_amounts" | "private";

export const PREVIEW_LABELS: Record<PreviewPrivacy, { label: string; description: string }> = {
  details: { label: "Mostrar detalhes", description: "O texto completo aparece no ecrã bloqueado." },
  hide_amounts: { label: "Esconder valores", description: "O assunto aparece, os valores não." },
  private: { label: "Privado", description: "Só \"tens uma nova atualização\". Os detalhes ficam na app." },
};

export interface QuietHours {
  enabled: boolean;
  /** "HH:MM" in the user's timezone. */
  start: string;
  end: string;
}

export interface ScheduleTime {
  enabled: boolean;
  /** "HH:MM" local. */
  time: string;
  /** 0 = Sunday. Weekly only. */
  weekday?: number;
  /** Day of month. Monthly only. */
  day?: number;
}

export interface NotificationPrefs {
  enabled: boolean;
  frequency: FrequencyPreset;
  categories: Record<PrefKey, ChannelPrefs>;
  quietHours: QuietHours;
  /** IANA timezone. Scheduling always resolves in this zone. */
  timezone: string;
  dailyBrief: ScheduleTime & { sections: BriefSection[] };
  weeklyReview: ScheduleTime;
  monthlyReview: ScheduleTime;
  preview: PreviewPrivacy;
  /** Maximum non-critical proactive notifications per day. */
  dailyBudget: number;
}

function channels(inApp: boolean, push = false, email = false): ChannelPrefs {
  return { inApp, push, email };
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  frequency: "balanced",
  categories: {
    upcoming_payments: channels(true, true),
    transaction_reminders: channels(true),
    goal_reminders: channels(true),
    goal_milestones: channels(true),
    goal_deadlines: channels(true),
    protected_money: channels(true),
    personal_actions: channels(true, true),
    reminders: channels(true, true),
    program_checkins: channels(true),
    agent_followups: channels(true),
    unallocated_money: channels(true),
    weekly_review: channels(true, false, false),
    monthly_review: channels(true, false, false),
    daily_brief: channels(true),
    agent_insights: channels(true),
    category_insights: channels(true),
    large_expense: channels(true),
    low_balance: channels(true, true),
    security: channels(true, true, true),
    system: channels(true),
  },
  quietHours: { enabled: true, start: "22:30", end: "08:00" },
  timezone:
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : "UTC",
  dailyBrief: { enabled: false, time: "08:00", sections: ["available", "upcoming", "goals"] },
  weeklyReview: { enabled: true, time: "18:00", weekday: 0 },
  monthlyReview: { enabled: true, time: "09:00", day: 1 },
  preview: "hide_amounts",
  dailyBudget: 3,
};

/* ------------------------------------------------------------------ */
/* Typed payloads                                                      */
/* ------------------------------------------------------------------ */

export type NotificationPayload =
  | { kind: "upcoming_payment"; recurringId: string; name: string; amountMinor: number; dueISO: string; overdue: boolean }
  | { kind: "payments_digest"; count: number; totalMinor: number; ids: string[] }
  | { kind: "goal_milestone"; walletId: string; name: string; percent: number }
  | { kind: "goal_funded"; walletId: string; name: string; savedMinor: number; targetMinor: number }
  | { kind: "goal_deadline"; walletId: string; name: string; days: number; savedMinor: number; targetMinor: number }
  | { kind: "goal_contribution"; walletId: string; name: string; amountMinor: number }
  | { kind: "unallocated_money"; amountMinor: number }
  | { kind: "protected_withdrawal"; transactionId: string; walletId: string; amountMinor: number; reason?: string }
  | { kind: "large_expense"; transactionId: string; amountMinor: number; categoryName?: string; accountName?: string; walletName?: string }
  | { kind: "low_wallet_balance"; walletId: string; name: string; balanceMinor: number; thresholdMinor: number }
  | { kind: "low_account_balance"; accountId: string; name: string; balanceMinor: number; thresholdMinor: number }
  | { kind: "insight"; insightId: string; detail?: string }
  | { kind: "daily_brief"; dateISO: string; lines: BriefLine[] }
  | { kind: "weekly_review"; startISO: string; endISO: string; incomeMinor: number; expensesMinor: number; builtMinor: number; goalsMinor: number; topCategory?: string; upcoming?: string }
  | { kind: "monthly_review"; monthLabel: string; incomeMinor: number; expensesMinor: number; builtMinor: number; goalsMinor: number; netWorthChangeMinor: number }
  | { kind: "security"; event: "new_login" | "password_changed" | "settings_changed" | "new_device"; detail?: string }
  | { kind: "personal_action"; actionId: string; title: string; whenISO: string; overdue: boolean }
  | { kind: "program_checkin"; programId: string; title: string; itemTitle: string; day: number }
  | { kind: "program_review"; programId: string; title: string; days: number }
  | { kind: "agent_followup"; conversationId: string; subject: string }
  | { kind: "reminder"; reminderId: string; title: string; whenISO: string; overdue: boolean }
  | { kind: "system"; message: string };

export interface BriefLine {
  section: BriefSection;
  label: string;
  value: string;
  /** Present when the line carries money, so previews can strip it. */
  amountMinor?: number;
}

export type PayloadKind = NotificationPayload["kind"];

export const PAYLOAD_PREF: Record<PayloadKind, PrefKey> = {
  upcoming_payment: "upcoming_payments",
  payments_digest: "upcoming_payments",
  goal_milestone: "goal_milestones",
  goal_funded: "goal_milestones",
  goal_deadline: "goal_deadlines",
  goal_contribution: "goal_reminders",
  unallocated_money: "unallocated_money",
  protected_withdrawal: "protected_money",
  large_expense: "large_expense",
  low_wallet_balance: "low_balance",
  low_account_balance: "low_balance",
  insight: "category_insights",
  daily_brief: "daily_brief",
  weekly_review: "weekly_review",
  monthly_review: "monthly_review",
  personal_action: "personal_actions",
  reminder: "reminders",
  program_checkin: "program_checkins",
  program_review: "program_checkins",
  agent_followup: "agent_followups",
  security: "security",
  system: "system",
};

export type NotificationActionId =
  | "view"
  | "mark_paid"
  | "remind_later"
  | "contribute"
  | "skip_contribution"
  | "distribute"
  | "open_report"
  | "ask_agent"
  | "reschedule"
  | "complete_action";

export const ACTION_LABELS: Record<NotificationActionId, string> = {
  view: "Ver",
  mark_paid: "Marcar como pago",
  remind_later: "Lembrar mais tarde",
  contribute: "Contribuir",
  skip_contribution: "Ignorar esta contribuição",
  distribute: "Distribuir",
  open_report: "Ver resumo completo",
  ask_agent: "Perguntar ao Agente",
  reschedule: "Remarcar",
  complete_action: "Marcar como feita",
};

export type DeliveryStatus = "created" | "queued" | "sent" | "delivered" | "failed" | "read" | "acted_on";

export interface Delivery {
  channel: Channel;
  status: DeliveryStatus;
  at: string;
  /** Technical detail, never shown to the user as-is. */
  detail?: string;
}

export interface AppNotification {
  id: string;
  /** Stable identity of the underlying event. Guarantees idempotency. */
  dedupeKey: string;
  category: NotificationCategory;
  prefKey: PrefKey;
  priority: Priority;
  title: string;
  body: string;
  createdAt: string;
  /** When the notification becomes visible (quiet hours / snooze push this forward). */
  deliverAt: string;
  read: boolean;
  dismissed: boolean;
  actedOn: boolean;
  status: DeliveryStatus;
  deliveries: Delivery[];
  payload: NotificationPayload;
  /** Deep link into the relevant screen. */
  to?: string;
  actions: NotificationActionId[];
  /** Groups low-priority siblings, e.g. several payments in one week. */
  groupKey?: string;
}

/** A notification the rules engine wants to create. Identity lives in `dedupeKey`. */
export interface NotificationDraft {
  dedupeKey: string;
  category: NotificationCategory;
  prefKey: PrefKey;
  priority: Priority;
  title: string;
  body: string;
  payload: NotificationPayload;
  to?: string;
  actions?: NotificationActionId[];
  groupKey?: string;
  /** Optional explicit delivery time (scheduled reviews). Defaults to now. */
  deliverAt?: string;
}

export interface DeviceRegistration {
  id: string;
  platform: "web" | "ios" | "android";
  /** Opaque push token. Never shared between users. */
  token: string;
  enabled: boolean;
  lastActiveAt: string;
  label: string;
}

export interface InteractionStats {
  opened: number;
  dismissed: number;
  acted: number;
}
