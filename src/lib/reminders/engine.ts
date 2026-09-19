/**
 * Deterministic reminder engine.
 *
 * Pure functions only: the same reminders and the same instant always produce
 * the same result, so a second pass never creates a duplicate notification.
 * A reminder whose time has passed is NEVER "failed" — it is simply due.
 */
import type { Recurrence, Reminder, ReminderDraft, ReminderStatus } from "./types";

export const SNOOZE_PRESETS = [
  { id: "15m", label: "15 minutos", minutes: 15 },
  { id: "1h", label: "1 hora", minutes: 60 },
  { id: "tomorrow", label: "Amanhã", minutes: 60 * 24 },
] as const;

export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** The next instant after `after` for a recurring reminder. Null when it does not repeat. */
export function nextOccurrence(reminder: Reminder, after: Date): Date | null {
  const { kind, interval = 1 } = reminder.recurrence;
  if (kind === "none") return null;
  let cursor = new Date(reminder.scheduledAt);
  let guard = 0;
  while (cursor.getTime() <= after.getTime() && guard < 500) {
    if (kind === "daily") cursor = addDays(cursor, interval);
    else if (kind === "weekly") cursor = addDays(cursor, 7 * interval);
    else if (kind === "monthly") cursor = addMonths(cursor, interval);
    else cursor = addMonths(cursor, 12 * interval);
    guard += 1;
  }
  return cursor;
}

export function isDue(reminder: Reminder, now: Date): boolean {
  if (reminder.status !== "scheduled") return false;
  if (reminder.snoozedUntil && new Date(reminder.snoozedUntil).getTime() > now.getTime()) {
    return false;
  }
  const due = reminder.snoozedUntil ? new Date(reminder.snoozedUntil) : new Date(reminder.scheduledAt);
  if (due.getTime() > now.getTime()) return false;
  // Already delivered for this occurrence.
  if (reminder.lastFiredAt && new Date(reminder.lastFiredAt).getTime() >= due.getTime()) return false;
  return true;
}

export function dueReminders(reminders: Reminder[], now: Date): Reminder[] {
  return reminders.filter((reminder) => isDue(reminder, now));
}

/** A stable key per reminder occurrence, so the same moment never notifies twice. */
export function reminderDedupeKey(reminder: Reminder): string {
  const at = reminder.snoozedUntil ?? reminder.scheduledAt;
  return `reminder:${reminder.id}:${at.slice(0, 16)}`;
}

/** After delivery: recurring reminders roll forward, one-off reminders stay done. */
export function afterDelivery(reminder: Reminder, now: Date): Reminder {
  const next = nextOccurrence(reminder, now);
  const base: Reminder = {
    ...reminder,
    lastFiredAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  if (!next) return base;
  const { snoozedUntil: _snoozed, ...withoutSnooze } = base;
  return { ...withoutSnooze, scheduledAt: next.toISOString() };
}

export function setStatus(reminder: Reminder, status: ReminderStatus, now: Date): Reminder {
  if (status === "completed") {
    const next = nextOccurrence(reminder, now);
    if (next) {
      const { snoozedUntil: _snoozed, ...rest } = reminder;
      return {
        ...rest,
        scheduledAt: next.toISOString(),
        status: "scheduled",
        updatedAt: now.toISOString(),
      };
    }
  }
  return { ...reminder, status, updatedAt: now.toISOString() };
}

/** Snoozing moves the SAME reminder — it never creates a second one. */
export function snooze(reminder: Reminder, minutes: number, now: Date): Reminder {
  const until = new Date(now.getTime() + minutes * 60_000);
  return { ...reminder, snoozedUntil: until.toISOString(), updatedAt: now.toISOString() };
}

export function reschedule(reminder: Reminder, scheduledAt: Date, localTime: string, now: Date): Reminder {
  const { snoozedUntil: _snoozed, lastFiredAt: _fired, ...rest } = reminder;
  return {
    ...rest,
    scheduledAt: scheduledAt.toISOString(),
    localTime,
    status: "scheduled",
    updatedAt: now.toISOString(),
  };
}

export function createReminder(draft: ReminderDraft, id: string, now: Date): Reminder {
  const recurrence: Recurrence = draft.recurrence ?? { kind: "none" };
  const reminder: Reminder = {
    id,
    title: draft.title.trim(),
    scheduledAt: draft.scheduledAt,
    localTime: draft.localTime,
    timezone: draft.timezone,
    anchor: draft.anchor ?? "local_time",
    recurrence,
    entityType: draft.entityType ?? "none",
    status: "scheduled",
    channels: draft.channels ?? { inApp: true, push: true },
    source: draft.source ?? "user",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  if (draft.description) reminder.description = draft.description;
  if (draft.entityId) reminder.entityId = draft.entityId;
  if (draft.to) reminder.to = draft.to;
  return reminder;
}

export type ReminderGroup = "overdue" | "today" | "week" | "later" | "done";

export function groupOf(reminder: Reminder, now: Date): ReminderGroup {
  if (reminder.status !== "scheduled") return "done";
  const at = new Date(reminder.snoozedUntil ?? reminder.scheduledAt);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = addDays(endOfToday, 7);
  if (at.getTime() < now.getTime()) return "overdue";
  if (at.getTime() <= endOfToday.getTime()) return "today";
  if (at.getTime() <= endOfWeek.getTime()) return "week";
  return "later";
}

export function sortReminders(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort((a, b) => {
    const at = new Date(a.snoozedUntil ?? a.scheduledAt).getTime();
    const bt = new Date(b.snoozedUntil ?? b.scheduledAt).getTime();
    return at - bt;
  });
}

/** Resolves a local calendar date + "HH:MM" into an instant. */
export function resolveInstant(dateKey: string, time: string): Date {
  const [hours = "9", minutes = "0"] = time.split(":");
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  return new Date(
    year ?? 1970,
    (month ?? 1) - 1,
    day ?? 1,
    Number(hours),
    Number(minutes),
    0,
    0,
  );
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}
