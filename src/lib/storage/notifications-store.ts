/**
 * Notification persistence.
 *
 * Device-local until the backend lands. The shape mirrors the future rows
 * (notifications, notification_preferences, notification_deliveries,
 * device_tokens, automation_rules, automation_runs) so the swap is contained.
 */
import { EMPTY_NOTIFICATIONS_STATE, type NotificationsState } from "@/lib/notifications/service";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/notifications/types";
import { installDefaultAutomations } from "@/lib/automations/engine";

const STORAGE_KEY = "pfos.notifications.v1";

export function loadNotifications(): NotificationsState {
  if (typeof window === "undefined") return EMPTY_NOTIFICATIONS_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_NOTIFICATIONS_STATE, automations: installDefaultAutomations() };
    }
    const parsed = JSON.parse(raw) as Partial<NotificationsState>;
    return {
      ...EMPTY_NOTIFICATIONS_STATE,
      ...parsed,
      prefs: {
        ...DEFAULT_NOTIFICATION_PREFS,
        ...parsed.prefs,
        categories: { ...DEFAULT_NOTIFICATION_PREFS.categories, ...parsed.prefs?.categories },
        quietHours: { ...DEFAULT_NOTIFICATION_PREFS.quietHours, ...parsed.prefs?.quietHours },
        dailyBrief: { ...DEFAULT_NOTIFICATION_PREFS.dailyBrief, ...parsed.prefs?.dailyBrief },
        weeklyReview: { ...DEFAULT_NOTIFICATION_PREFS.weeklyReview, ...parsed.prefs?.weeklyReview },
        monthlyReview: { ...DEFAULT_NOTIFICATION_PREFS.monthlyReview, ...parsed.prefs?.monthlyReview },
      },
      automations: parsed.automations?.length ? parsed.automations : installDefaultAutomations(),
      notifications: parsed.notifications ?? [],
      runs: parsed.runs ?? [],
      devices: parsed.devices ?? [],
      cooldowns: parsed.cooldowns ?? {},
    };
  } catch {
    return { ...EMPTY_NOTIFICATIONS_STATE, automations: installDefaultAutomations() };
  }
}

export function saveNotifications(state: NotificationsState): void {
  if (typeof window === "undefined") return;
  // History stays bounded so the device store never grows without limit.
  const trimmed: NotificationsState = {
    ...state,
    notifications: state.notifications.slice(0, 200),
    runs: state.runs.slice(0, 100),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}
