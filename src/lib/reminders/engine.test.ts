import { describe, expect, it } from "vitest";

import {
  afterDelivery,
  createReminder,
  dueReminders,
  groupOf,
  nextOccurrence,
  reminderDedupeKey,
  reschedule,
  setStatus,
  snooze,
} from "./engine";
import type { Reminder } from "./types";

const NOW = new Date("2026-03-10T19:00:00.000Z");

function make(patch: Partial<Reminder> = {}): Reminder {
  return {
    ...createReminder(
      {
        title: "Rever gastos",
        scheduledAt: "2026-03-10T19:00:00.000Z",
        localTime: "19:00",
        timezone: "Africa/Maputo",
      },
      "r1",
      NOW,
    ),
    ...patch,
  };
}

describe("reminder engine", () => {
  it("a one-off reminder is due at its time and only once", () => {
    const reminder = make();
    expect(dueReminders([reminder], NOW)).toHaveLength(1);
    const delivered = afterDelivery(reminder, NOW);
    expect(dueReminders([delivered], NOW)).toHaveLength(0);
  });

  it("does not fire before its time", () => {
    const reminder = make({ scheduledAt: "2026-03-11T19:00:00.000Z" });
    expect(dueReminders([reminder], NOW)).toHaveLength(0);
  });

  it("a daily reminder rolls forward instead of repeating the same instant", () => {
    const reminder = make({ recurrence: { kind: "daily" } });
    const delivered = afterDelivery(reminder, NOW);
    expect(delivered.scheduledAt).toBe("2026-03-11T19:00:00.000Z");
    expect(dueReminders([delivered], NOW)).toHaveLength(0);
  });

  it("weekly recurrence advances seven days", () => {
    const reminder = make({ recurrence: { kind: "weekly" } });
    expect(nextOccurrence(reminder, NOW)?.toISOString()).toBe("2026-03-17T19:00:00.000Z");
  });

  it("snoozing moves the same reminder, it never creates another", () => {
    const reminder = make();
    const snoozed = snooze(reminder, 60, NOW);
    expect(snoozed.id).toBe(reminder.id);
    expect(dueReminders([snoozed], NOW)).toHaveLength(0);
    expect(dueReminders([snoozed], new Date("2026-03-10T20:01:00.000Z"))).toHaveLength(1);
  });

  it("completing a one-off reminder ends it; completing a recurring one schedules the next", () => {
    expect(setStatus(make(), "completed", NOW).status).toBe("completed");
    const recurring = setStatus(make({ recurrence: { kind: "daily" } }), "completed", NOW);
    expect(recurring.status).toBe("scheduled");
    expect(recurring.scheduledAt).toBe("2026-03-11T19:00:00.000Z");
  });

  it("cancelled and completed reminders never fire", () => {
    expect(dueReminders([make({ status: "cancelled" })], NOW)).toHaveLength(0);
    expect(dueReminders([make({ status: "completed" })], NOW)).toHaveLength(0);
  });

  it("rescheduling clears the snooze and the delivery mark", () => {
    const snoozed = snooze(make(), 60, NOW);
    const moved = reschedule(snoozed, new Date("2026-03-12T07:00:00.000Z"), "07:00", NOW);
    expect(moved.snoozedUntil).toBeUndefined();
    expect(moved.status).toBe("scheduled");
    expect(moved.localTime).toBe("07:00");
  });

  it("the dedupe key is stable for the same occurrence", () => {
    const reminder = make();
    expect(reminderDedupeKey(reminder)).toBe(reminderDedupeKey({ ...reminder }));
    expect(reminderDedupeKey(reminder)).not.toBe(
      reminderDedupeKey({ ...reminder, scheduledAt: "2026-03-11T19:00:00.000Z" }),
    );
  });

  it("groups a past reminder as overdue, never as failed", () => {
    const past = make({ scheduledAt: "2026-03-09T19:00:00.000Z" });
    expect(groupOf(past, NOW)).toBe("overdue");
    expect(past.status).toBe("scheduled");
  });
});
