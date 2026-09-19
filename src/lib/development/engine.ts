/**
 * Deterministic Personal Development calculations.
 *
 * No AI in this file. The Agent may read and explain these results; it never
 * produces them. Every function is pure: nothing here mutates state and
 * nothing here touches money.
 */
import type {
  ActionStatus,
  Decision,
  EvolutionEvent,
  PersonalAction,
  Program,
  ProgramItem,
} from "./types";

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/* --------------------------------- actions -------------------------------- */

/**
 * Time passing never marks an action as failed. It becomes "atrasada" and the
 * person decides what to do with it.
 */
export type ActionState = "done" | "skipped" | "overdue" | "today" | "upcoming" | "someday";

export const ACTION_STATE_LABELS: Record<ActionState, string> = {
  done: "Feita",
  skipped: "Deixada de lado",
  overdue: "Atrasada",
  today: "Hoje",
  upcoming: "A seguir",
  someday: "Sem data",
};

export function actionState(
  action: Pick<PersonalAction, "status" | "scheduledDate">,
  today: string,
): ActionState {
  if (action.status === "done") return "done";
  if (action.status === "skipped") return "skipped";
  if (!action.scheduledDate) return "someday";
  if (action.scheduledDate < today) return "overdue";
  if (action.scheduledDate === today) return "today";
  return "upcoming";
}

const PRIORITY_ORDER = { now: 0, important: 1, later: 2 } as const;

/** Overdue first, then today, then the nearest dates. Priority breaks ties. */
export function sortActions(actions: PersonalAction[], today: string): PersonalAction[] {
  const rank: Record<ActionState, number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    someday: 3,
    done: 4,
    skipped: 5,
  };
  return actions.slice().sort((a, b) => {
    const ra = rank[actionState(a, today)];
    const rb = rank[actionState(b, today)];
    if (ra !== rb) return ra - rb;
    if (a.scheduledDate && b.scheduledDate && a.scheduledDate !== b.scheduledDate)
      return a.scheduledDate.localeCompare(b.scheduledDate);
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

/* -------------------------------- programs -------------------------------- */

export interface ProgramProgress {
  /** Facts only. There is deliberately no percentage "score" of the person. */
  total: number;
  done: number;
  skipped: number;
  pending: number;
  /** 1-based day the program is on, or null before it starts / after it ends. */
  currentDay: number | null;
  daysTotal: number;
  endDate: string;
  finished: boolean;
  nextItem: ProgramItem | null;
}

export function programItemDate(program: Program, item: ProgramItem): string {
  return item.scheduledDate ?? addDays(program.startDate, Math.max(0, item.day - 1));
}

export function programProgress(program: Program, today: string): ProgramProgress {
  const done = program.items.filter((i) => i.status === "done").length;
  const skipped = program.items.filter((i) => i.status === "skipped").length;
  const endDate = addDays(program.startDate, Math.max(0, program.durationDays - 1));

  let currentDay: number | null = null;
  if (today >= program.startDate && today <= endDate) {
    const [ys, ms, ds] = program.startDate.split("-").map(Number);
    const [yt, mt, dt] = today.split("-").map(Number);
    const start = Date.UTC(ys ?? 1970, (ms ?? 1) - 1, ds ?? 1);
    const now = Date.UTC(yt ?? 1970, (mt ?? 1) - 1, dt ?? 1);
    currentDay = Math.floor((now - start) / 86_400_000) + 1;
  }

  const pendingItems = program.items
    .filter((i) => i.status === "pending")
    .slice()
    .sort((a, b) =>
      a.day === b.day ? a.order - b.order : a.day - b.day,
    );

  return {
    total: program.items.length,
    done,
    skipped,
    pending: pendingItems.length,
    currentDay,
    daysTotal: program.durationDays,
    endDate,
    finished: today > endDate || program.status === "completed",
    nextItem: pendingItems[0] ?? null,
  };
}

/** A finished program earns a review offer, never a celebration score. */
export function programsNeedingReview(programs: Program[], today: string): Program[] {
  return programs.filter(
    (program) => program.status === "active" && programProgress(program, today).finished,
  );
}

/* ---------------------------------- today ---------------------------------- */

export interface TodayEntry {
  id: string;
  kind: "action" | "program";
  title: string;
  detail?: string | undefined;
  state: ActionState;
  time?: string | undefined;
  programId?: string | undefined;
  planId?: string | undefined;
  status: ActionStatus;
}

export interface TodayFeed {
  entries: TodayEntry[];
  overdueCount: number;
  /** True when there is genuinely nothing scheduled — an honest empty state. */
  empty: boolean;
}

/**
 * Today stays small on purpose: overdue items, today's items, and nothing else.
 * It is not a task manager and never shows twenty cards.
 */
export function todayFeed(
  input: { actions: PersonalAction[]; programs: Program[] },
  today: string,
  limit = 6,
): TodayFeed {
  const entries: TodayEntry[] = [];

  for (const action of sortActions(input.actions, today)) {
    // Program items are surfaced through the program, not twice.
    if (action.programItemId) continue;
    const state = actionState(action, today);
    if (state !== "overdue" && state !== "today") continue;
    entries.push({
      id: action.id,
      kind: "action",
      title: action.title,
      state,
      status: action.status,
      ...(action.scheduledTime ? { time: action.scheduledTime } : {}),
      ...(action.planId ? { planId: action.planId } : {}),
    });
  }

  for (const program of input.programs) {
    if (program.status !== "active") continue;
    for (const item of program.items) {
      if (item.status !== "pending") continue;
      const date = programItemDate(program, item);
      if (date > today) continue;
      entries.push({
        id: item.id,
        kind: "program",
        title: item.title,
        detail: program.title,
        state: date < today ? "overdue" : "today",
        status: item.status,
        programId: program.id,
        ...(item.scheduledTime ? { time: item.scheduledTime } : {}),
      });
    }
  }

  const ordered = entries.sort((a, b) => {
    if (a.state !== b.state) return a.state === "overdue" ? -1 : 1;
    return (a.time ?? "99:99").localeCompare(b.time ?? "99:99");
  });

  return {
    entries: ordered.slice(0, limit),
    overdueCount: ordered.filter((e) => e.state === "overdue").length,
    empty: ordered.length === 0,
  };
}

/* -------------------------------- evolution -------------------------------- */

export interface EvolutionMonth {
  /** YYYY-MM. */
  key: string;
  events: EvolutionEvent[];
}

/** Grouped by month, most recent first. Hidden entries stay out. */
export function evolutionTimeline(events: EvolutionEvent[]): EvolutionMonth[] {
  const months = new Map<string, EvolutionEvent[]>();
  for (const event of events) {
    if (event.hidden) continue;
    const key = event.at.slice(0, 7);
    const list = months.get(key) ?? [];
    list.push(event);
    months.set(key, list);
  }
  return [...months.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => ({
      key,
      events: list.slice().sort((a, b) => b.at.localeCompare(a.at)),
    }));
}

/* --------------------------------- reviews --------------------------------- */

export interface DevelopmentReviewFacts {
  actionsCompleted: number;
  actionsPending: number;
  programsActive: number;
  programsCompleted: number;
  decisionsRecorded: number;
  changes: EvolutionEvent[];
}

/** Concrete facts for the period. No score, no judgement, no projection. */
export function developmentReviewFacts(
  input: {
    actions: PersonalAction[];
    programs: Program[];
    decisions: Decision[];
    evolution: EvolutionEvent[];
  },
  fromISO: string,
  toISO: string,
): DevelopmentReviewFacts {
  const within = (iso?: string) => !!iso && iso >= fromISO && iso <= toISO;
  return {
    actionsCompleted: input.actions.filter((a) => a.status === "done" && within(a.completedAt)).length,
    actionsPending: input.actions.filter((a) => a.status === "pending").length,
    programsActive: input.programs.filter((p) => p.status === "active").length,
    programsCompleted: input.programs.filter((p) => p.status === "completed" && within(p.completedAt))
      .length,
    decisionsRecorded: input.decisions.filter((d) => within(d.createdAt)).length,
    changes: input.evolution.filter((e) => !e.hidden && within(e.at)),
  };
}
