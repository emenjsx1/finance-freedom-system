/**
 * Analytics periods (Phase 07).
 *
 * All boundaries are built with local-time constructors, so a transaction is
 * always counted on the day the user lived it — never shifted by a UTC
 * boundary. A period is a half-open range [start, end).
 */

export type PeriodKey =
  | "this_month"
  | "last_month"
  | "3_months"
  | "6_months"
  | "this_year"
  | "custom";

export interface Period {
  key: PeriodKey;
  label: string;
  /** Inclusive start (local midnight). */
  start: Date;
  /** Exclusive end (local midnight). */
  end: Date;
  /** True when the period contains today and has not finished yet. */
  partial: boolean;
  /** Days already elapsed inside the period (1-based, capped at the length). */
  daysElapsed: number;
  totalDays: number;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "this_month", label: "Este mês" },
  { key: "last_month", label: "Mês passado" },
  { key: "3_months", label: "3 meses" },
  { key: "6_months", label: "6 meses" },
  { key: "this_year", label: "Este ano" },
  { key: "custom", label: "Personalizado" },
];

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const DAY_MS = 86_400_000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS));
}

export function monthLabel(date: Date, withYear = false): string {
  const name = MONTHS[date.getMonth()] ?? "";
  return withYear ? `${name} de ${date.getFullYear()}` : name;
}

export function formatDay(date: Date): string {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

function build(key: PeriodKey, label: string, start: Date, end: Date, now: Date): Period {
  const partial = now >= start && now < end;
  const totalDays = daysBetween(start, end);
  const daysElapsed = partial ? Math.min(totalDays, daysBetween(start, startOfDay(now)) + 1) : totalDays;
  return { key, label, start, end, partial, daysElapsed, totalDays };
}

export interface CustomRange {
  start: string;
  end: string;
}

/** The single place a period is resolved from a user choice. */
export function resolvePeriod(key: PeriodKey, custom?: CustomRange | undefined, now = new Date()): Period {
  const today = startOfDay(now);
  switch (key) {
    case "last_month": {
      const start = addMonths(startOfMonth(today), -1);
      return build(key, monthLabel(start, true), start, startOfMonth(today), now);
    }
    case "3_months": {
      const start = addMonths(startOfMonth(today), -2);
      return build(key, "Últimos 3 meses", start, addMonths(startOfMonth(today), 1), now);
    }
    case "6_months": {
      const start = addMonths(startOfMonth(today), -5);
      return build(key, "Últimos 6 meses", start, addMonths(startOfMonth(today), 1), now);
    }
    case "this_year": {
      const start = new Date(today.getFullYear(), 0, 1);
      return build(key, String(today.getFullYear()), start, new Date(today.getFullYear() + 1, 0, 1), now);
    }
    case "custom": {
      const start = custom?.start ? parseISODate(custom.start) : startOfMonth(today);
      const rawEnd = custom?.end ? parseISODate(custom.end) : today;
      const end = new Date(rawEnd.getFullYear(), rawEnd.getMonth(), rawEnd.getDate() + 1);
      return build(key, `${formatDay(start)} → ${formatDay(rawEnd)}`, start, end, now);
    }
    case "this_month":
    default: {
      const start = startOfMonth(today);
      return build("this_month", monthLabel(start, true), start, addMonths(start, 1), now);
    }
  }
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** The comparable period immediately before this one. */
export function previousPeriod(period: Period): Period {
  if (period.key === "this_month" || period.key === "last_month") {
    const start = addMonths(period.start, -1);
    return {
      key: period.key,
      label: monthLabel(start, true),
      start,
      end: period.start,
      partial: false,
      daysElapsed: daysBetween(start, period.start),
      totalDays: daysBetween(start, period.start),
    };
  }
  const length = period.end.getTime() - period.start.getTime();
  const start = new Date(period.start.getTime() - length);
  return {
    key: period.key,
    label: `${formatDay(start)} → ${formatDay(new Date(period.start.getTime() - DAY_MS))}`,
    start,
    end: period.start,
    partial: false,
    daysElapsed: daysBetween(start, period.start),
    totalDays: daysBetween(start, period.start),
  };
}

/**
 * The same number of elapsed days inside the previous period, so an unfinished
 * month is never compared against a full one without saying so.
 */
export function equivalentSlice(previous: Period, daysElapsed: number): Period {
  const end = new Date(previous.start.getFullYear(), previous.start.getMonth(), previous.start.getDate() + daysElapsed);
  const cappedEnd = end > previous.end ? previous.end : end;
  const lastDay = new Date(cappedEnd.getTime() - DAY_MS);
  return {
    ...previous,
    label: `${formatDay(previous.start)} → ${formatDay(lastDay)}`,
    end: cappedEnd,
    totalDays: daysBetween(previous.start, cappedEnd),
    daysElapsed: daysBetween(previous.start, cappedEnd),
  };
}

export function inPeriod(iso: string, period: Period): boolean {
  const t = new Date(iso).getTime();
  return t >= period.start.getTime() && t < period.end.getTime();
}

/** Month buckets covering the last `count` months, oldest first. */
export function lastMonths(count: number, now = new Date()): Period[] {
  const base = startOfMonth(startOfDay(now));
  const out: Period[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = addMonths(base, -i);
    out.push(build("this_month", monthLabel(start, start.getFullYear() !== now.getFullYear()), start, addMonths(start, 1), now));
  }
  return out;
}
