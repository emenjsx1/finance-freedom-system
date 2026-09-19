import { pt } from "@/lib/i18n/pt";

export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return pt.home.morning;
  if (hour < 19) return pt.home.afternoon;
  return pt.home.evening;
}
