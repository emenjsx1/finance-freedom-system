/**
 * Personal notification rules.
 *
 * Same discipline as the financial rules: deterministic signals only, stable
 * dedupe keys, no motivation, no guilt. A missed action is never a failure —
 * the wording always offers a way forward.
 */
import { actionState, programProgress, toDateKey } from "@/lib/development/engine";
import type { DevelopmentState } from "@/lib/development/types";
import type { NotificationDraft } from "./types";

export function personalDrafts(dev: DevelopmentState, now = new Date()): NotificationDraft[] {
  const out: NotificationDraft[] = [];
  const todayKey = toDateKey(now);

  for (const action of dev.actions) {
    if (action.status !== "pending" || !action.scheduledDate) continue;
    const state = actionState(action, todayKey);
    if (state !== "today" && state !== "overdue") continue;
    out.push({
      dedupeKey: `personal_action:${action.id}:${todayKey}`,
      category: "personal",
      prefKey: "personal_actions",
      priority: "normal",
      title: state === "overdue" ? "Ação por fechar" : "Próxima ação",
      body: action.title,
      payload: {
        kind: "personal_action",
        actionId: action.id,
        title: action.title,
        whenISO: action.scheduledDate,
        overdue: state === "overdue",
      },
      to: "/app/development/today",
      actions: ["complete_action", "reschedule", "view"],
      groupKey: "personal_actions",
    });
  }

  for (const program of dev.programs) {
    if (program.status !== "active") continue;
    const progress = programProgress(program, todayKey);
    if (progress.finished) {
      out.push({
        dedupeKey: `program_review:${program.id}`,
        category: "personal",
        prefKey: "program_checkins",
        priority: "normal",
        title: `Terminaste os ${progress.daysTotal} dias`,
        body: `${program.title} · queres rever o que mudou?`,
        payload: {
          kind: "program_review",
          programId: program.id,
          title: program.title,
          days: progress.daysTotal,
        },
        to: `/app/development/programs/${program.id}`,
        actions: ["view"],
      });
      continue;
    }
    const next = progress.nextItem;
    if (next && next.type === "checkin") {
      out.push({
        dedupeKey: `program_checkin:${program.id}:${next.id}`,
        category: "personal",
        prefKey: "program_checkins",
        priority: "low",
        title: program.title,
        body: next.title,
        payload: {
          kind: "program_checkin",
          programId: program.id,
          title: program.title,
          itemTitle: next.title,
          day: next.day,
        },
        to: `/app/development/programs/${program.id}`,
        actions: ["view", "ask_agent"],
      });
    }
  }

  return out;
}
