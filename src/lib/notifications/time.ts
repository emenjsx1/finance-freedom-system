/**
 * Scheduling helpers.
 *
 * All scheduling resolves in the user's local time. The stored IANA timezone
 * is what a future server scheduler will use; on the device we evaluate with
 * the local clock so "Sunday 18:00" always means the user's Sunday 18:00.
 * Schedules are keyed by local calendar date, so a timezone change can never
 * duplicate an already-created occurrence.
 */

export function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":");
  return { hours: Number(h ?? 0) || 0, minutes: Number(m ?? 0) || 0 };
}

export function atLocalTime(date: Date, time: string): Date {
  const { hours, minutes } = parseTime(time);
  const out = new Date(date);
  out.setHours(hours, minutes, 0, 0);
  return out;
}

/** Local calendar date, e.g. 2026-09-19. Used inside dedupe keys. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function localMonthKey(date: Date): string {
  return localDateKey(date).slice(0, 7);
}

export function isWithinQuietHours(now: Date, quiet: { enabled: boolean; start: string; end: string }): boolean {
  if (!quiet.enabled) return false;
  const start = parseTime(quiet.start);
  const end = parseTime(quiet.end);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const s = start.hours * 60 + start.minutes;
  const e = end.hours * 60 + end.minutes;
  // A window that crosses midnight (22:30 → 08:00) wraps around.
  return s <= e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

/** The moment quiet hours end, relative to `now`. */
export function quietHoursEnd(now: Date, quiet: { enabled: boolean; start: string; end: string }): Date {
  const end = atLocalTime(now, quiet.end);
  if (end <= now) end.setDate(end.getDate() + 1);
  return end;
}

export function daysUntil(iso: string, now: Date): number {
  const target = new Date(iso);
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(target);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function relativeTime(iso: string, now = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

export function dayLabel(iso: string, now = new Date()): string {
  const days = daysUntil(iso, now);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days < 0) return `há ${Math.abs(days)} dias`;
  return `em ${days} dias`;
}
