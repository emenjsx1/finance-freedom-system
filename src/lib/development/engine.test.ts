import { describe, expect, it } from "vitest";

import {
  actionState,
  addDays,
  developmentReviewFacts,
  evolutionTimeline,
  programProgress,
  sortActions,
  todayFeed,
} from "./engine";
import type { PersonalAction, Program } from "./types";

const TODAY = "2026-03-10";

function action(patch: Partial<PersonalAction>): PersonalAction {
  return {
    id: patch.id ?? Math.random().toString(36).slice(2),
    title: "Ação",
    status: "pending",
    priority: "important",
    reminder: false,
    source: "user",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...patch,
  };
}

function program(patch: Partial<Program> = {}): Program {
  return {
    id: "p1",
    title: "Reset financeiro",
    status: "active",
    startDate: "2026-03-08",
    durationDays: 7,
    source: "user",
    items: [
      { id: "i1", type: "action", title: "Rever gastos", day: 1, status: "done", reminder: false, order: 0 },
      { id: "i2", type: "action", title: "Rever compromissos", day: 2, status: "pending", reminder: false, order: 1 },
      { id: "i3", type: "review", title: "Rever a semana", day: 7, status: "pending", reminder: false, order: 2 },
    ],
    createdAt: "2026-03-08T00:00:00.000Z",
    updatedAt: "2026-03-08T00:00:00.000Z",
    ...patch,
  };
}

describe("dates", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-02-27", 3)).toBe("2026-03-02");
  });
});

describe("actionState", () => {
  it("never calls a missed action failed", () => {
    expect(actionState(action({ scheduledDate: "2026-03-01" }), TODAY)).toBe("overdue");
    expect(actionState(action({ scheduledDate: TODAY }), TODAY)).toBe("today");
    expect(actionState(action({ scheduledDate: "2026-03-20" }), TODAY)).toBe("upcoming");
    expect(actionState(action({}), TODAY)).toBe("someday");
    expect(actionState(action({ status: "done" }), TODAY)).toBe("done");
  });

  it("sorts overdue before today and undated last", () => {
    const list = [
      action({ id: "a", scheduledDate: "2026-03-20" }),
      action({ id: "b" }),
      action({ id: "c", scheduledDate: "2026-03-01" }),
      action({ id: "d", scheduledDate: TODAY }),
    ];
    expect(sortActions(list, TODAY).map((a) => a.id)).toEqual(["c", "d", "a", "b"]);
  });
});

describe("programProgress", () => {
  it("reports facts and the current day without any score", () => {
    const result = programProgress(program(), TODAY);
    expect(result.total).toBe(3);
    expect(result.done).toBe(1);
    expect(result.pending).toBe(2);
    expect(result.currentDay).toBe(3);
    expect(result.endDate).toBe("2026-03-14");
    expect(result.finished).toBe(false);
    expect(result.nextItem?.id).toBe("i2");
  });

  it("marks the program finished after the last day", () => {
    expect(programProgress(program(), "2026-03-20").finished).toBe(true);
    expect(programProgress(program(), "2026-03-20").currentDay).toBeNull();
  });
});

describe("todayFeed", () => {
  it("shows only what is due, stays small and counts overdue", () => {
    const feed = todayFeed(
      {
        actions: [
          action({ id: "a", title: "Ligar ao contabilista", scheduledDate: "2026-03-02" }),
          action({ id: "b", title: "Estudar Java", scheduledDate: TODAY }),
          action({ id: "c", title: "Depois", scheduledDate: "2026-04-01" }),
          action({ id: "d", title: "Sem data" }),
        ],
        programs: [program()],
      },
      TODAY,
    );
    expect(feed.entries.map((e) => e.title)).toEqual([
      "Ligar ao contabilista",
      "Rever compromissos",
      "Estudar Java",
    ]);
    expect(feed.overdueCount).toBe(2);
    expect(feed.empty).toBe(false);
  });

  it("is honestly empty when nothing is scheduled", () => {
    expect(todayFeed({ actions: [], programs: [] }, TODAY).empty).toBe(true);
  });
});

describe("evolution and review", () => {
  it("groups real events by month and hides what the person hid", () => {
    const months = evolutionTimeline([
      { id: "1", kind: "plan_created", title: "Plano Turquia", at: "2026-03-02T10:00:00.000Z" },
      { id: "2", kind: "decision_recorded", title: "Sem carro este ano", at: "2026-02-11T10:00:00.000Z" },
      { id: "3", kind: "context_saved", title: "Escondido", at: "2026-03-05T10:00:00.000Z", hidden: true },
    ]);
    expect(months.map((m) => m.key)).toEqual(["2026-03", "2026-02"]);
    expect(months[0]?.events).toHaveLength(1);
  });

  it("counts only real facts inside the period", () => {
    const facts = developmentReviewFacts(
      {
        actions: [
          action({ status: "done", completedAt: "2026-03-05T10:00:00.000Z" }),
          action({ status: "done", completedAt: "2026-01-05T10:00:00.000Z" }),
          action({}),
        ],
        programs: [program()],
        decisions: [],
        evolution: [],
      },
      "2026-03-01T00:00:00.000Z",
      "2026-03-31T23:59:59.999Z",
    );
    expect(facts.actionsCompleted).toBe(1);
    expect(facts.actionsPending).toBe(1);
    expect(facts.programsActive).toBe(1);
    expect(facts.decisionsRecorded).toBe(0);
  });
});
