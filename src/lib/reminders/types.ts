/**
 * Reminder domain.
 *
 * A reminder is a user intention with a time. It is NOT a notification:
 * the notification is one delivery of the reminder. A reminder still exists
 * (and still shows in the app) when push is denied, unsupported, or failing.
 */

export type ReminderStatus = "scheduled" | "completed" | "skipped" | "cancelled" | "expired";

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  scheduled: "Marcado",
  completed: "Feito",
  skipped: "Ignorado",
  cancelled: "Cancelado",
  expired: "Passou",
};

export type RecurrenceKind = "none" | "daily" | "weekly" | "monthly" | "yearly";

export const RECURRENCE_LABELS: Record<RecurrenceKind, string> = {
  none: "Uma vez",
  daily: "Todos os dias",
  weekly: "Todas as semanas",
  monthly: "Todos os meses",
  yearly: "Todos os anos",
};

export interface Recurrence {
  kind: RecurrenceKind;
  /** Every N days/weeks/months/years. Defaults to 1. */
  interval?: number;
}

export type ReminderEntityType =
  | "plan"
  | "program"
  | "action"
  | "commitment"
  | "review"
  | "account"
  | "none";

export type ReminderSource = "user" | "agent_confirmed";

/**
 * `anchor` distinguishes the two different things a person can mean:
 * - "local_time": every day at 08:00 wherever I am (recomputed on travel)
 * - "absolute": in 24 hours (a fixed instant)
 */
export type ReminderAnchor = "local_time" | "absolute";

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  /** The instant it should fire, resolved from the local time + timezone. */
  scheduledAt: string;
  /** "HH:MM" the person actually chose, kept so travel can re-resolve it. */
  localTime: string;
  /** IANA timezone the reminder was created in. */
  timezone: string;
  anchor: ReminderAnchor;
  recurrence: Recurrence;
  entityType: ReminderEntityType;
  entityId?: string;
  /** Validated internal route opened when the reminder is tapped. */
  to?: string;
  status: ReminderStatus;
  channels: { inApp: boolean; push: boolean };
  source: ReminderSource;
  createdAt: string;
  updatedAt: string;
  /** Last time a notification was produced for this reminder. Guards duplicates. */
  lastFiredAt?: string;
  snoozedUntil?: string;
}

export interface ReminderDraft {
  title: string;
  description?: string;
  scheduledAt: string;
  localTime: string;
  timezone: string;
  anchor?: ReminderAnchor;
  recurrence?: Recurrence;
  entityType?: ReminderEntityType;
  entityId?: string;
  to?: string;
  channels?: { inApp: boolean; push: boolean };
  source?: ReminderSource;
}

/** How the reminder will actually reach the person right now. */
export type DeliveryReadiness = "in_app_only" | "push_ready" | "push_blocked" | "push_pending_server";

export const DELIVERY_LABELS: Record<DeliveryReadiness, string> = {
  in_app_only: "Só dentro da app",
  push_ready: "Aviso no telemóvel",
  push_blocked: "Avisos bloqueados no navegador",
  push_pending_server: "Só dentro da app por agora",
};
