/**
 * Reminders → notification drafts.
 *
 * The reminder is the intention; the draft is one delivery of it. Copy is
 * privacy-conscious by default — the reminder title is shown, never the
 * description or any personal reflection.
 */
import { dueReminders, reminderDedupeKey } from "@/lib/reminders/engine";
import type { Reminder } from "@/lib/reminders/types";
import type { NotificationDraft } from "./types";

function safeRoute(to: string | undefined): string {
  if (!to || !to.startsWith("/app")) return "/app/reminders";
  return to;
}

export function reminderDrafts(reminders: Reminder[], now: Date): NotificationDraft[] {
  return dueReminders(reminders, now).map((reminder) => {
    const overdue = new Date(reminder.scheduledAt).getTime() < now.getTime() - 60_000;
    return {
      dedupeKey: reminderDedupeKey(reminder),
      category: "reminders" as const,
      prefKey: "reminders" as const,
      priority: "normal" as const,
      title: reminder.title,
      body: overdue ? "Este lembrete era para agora há pouco." : "O teu lembrete está pronto.",
      payload: {
        kind: "reminder" as const,
        reminderId: reminder.id,
        title: reminder.title,
        whenISO: reminder.scheduledAt,
        overdue,
      },
      to: safeRoute(reminder.to),
      actions: ["complete_action", "remind_later", "view"],
    };
  });
}
