/**
 * Notification service.
 *
 * Pure state transitions: the rules layer produces drafts, this module decides
 * what actually becomes a notification (preferences, quiet hours, budget,
 * deduplication) and hands it to the channel adapters.
 */
import { deliverAll, type DeliveryContext } from "./channels";
import {
  DEFAULT_NOTIFICATION_PREFS,
  FREQUENCY_ALLOWED,
  type AppNotification,
  type DeviceRegistration,
  type InteractionStats,
  type NotificationDraft,
  type NotificationFilter,
  type NotificationPrefs,
  type PrefKey,
} from "./types";
import type { CooldownState } from "./rules";
import type { Reminder } from "@/lib/reminders/types";
import type { AutomationRule, AutomationRun } from "@/lib/automations/types";
import { isWithinQuietHours, localDateKey, quietHoursEnd } from "./time";

export interface NotificationsState {
  notifications: AppNotification[];
  prefs: NotificationPrefs;
  automations: AutomationRule[];
  runs: AutomationRun[];
  devices: DeviceRegistration[];
  /** User reminders. A reminder exists even when push is off. */
  reminders: Reminder[];
  cooldowns: CooldownState;
  interactions: InteractionStats;
  lastRunAt: string | null;
  /** Optional destination for the email adapter. */
  email: string | null;
}

export const EMPTY_NOTIFICATIONS_STATE: NotificationsState = {
  notifications: [],
  prefs: DEFAULT_NOTIFICATION_PREFS,
  automations: [],
  runs: [],
  devices: [],
  reminders: [],
  cooldowns: {},
  interactions: { opened: 0, dismissed: 0, acted: 0 },
  lastRunAt: null,
  email: null,
};

/** Keeps history bounded on device. */
const MAX_NOTIFICATIONS = 200;

/** A category passes only when the user allows it AND the frequency preset includes it. */
export function isAllowed(prefs: NotificationPrefs, key: PrefKey): boolean {
  if (!prefs.enabled) return false;
  const channels = prefs.categories[key];
  if (!channels || (!channels.inApp && !channels.push && !channels.email)) return false;
  if (prefs.frequency === "custom") return true;
  return FREQUENCY_ALLOWED[prefs.frequency].includes(key);
}

function isCritical(priority: AppNotification["priority"]): boolean {
  return priority === "security" || priority === "high";
}

function budgetSpent(state: NotificationsState, now: Date): number {
  const today = localDateKey(now);
  return state.notifications.filter(
    (n) => localDateKey(new Date(n.createdAt)) === today && !isCritical(n.priority),
  ).length;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface IngestResult {
  state: NotificationsState;
  created: AppNotification[];
  suppressed: { dedupeKey: string; reason: "duplicate" | "preference" | "budget" }[];
}

export function ingest(state: NotificationsState, drafts: NotificationDraft[], now = new Date()): IngestResult {
  const existing = new Set(state.notifications.map((n) => n.dedupeKey));
  const created: AppNotification[] = [];
  const suppressed: IngestResult["suppressed"] = [];
  let spent = budgetSpent(state, now);

  const context: DeliveryContext = {
    prefs: state.prefs,
    devices: state.devices,
    now,
    email: state.email ?? undefined,
  };

  for (const draft of drafts) {
    if (existing.has(draft.dedupeKey)) {
      suppressed.push({ dedupeKey: draft.dedupeKey, reason: "duplicate" });
      continue;
    }
    if (!isAllowed(state.prefs, draft.prefKey)) {
      suppressed.push({ dedupeKey: draft.dedupeKey, reason: "preference" });
      continue;
    }
    if (!isCritical(draft.priority) && spent >= state.prefs.dailyBudget) {
      suppressed.push({ dedupeKey: draft.dedupeKey, reason: "budget" });
      continue;
    }

    // Quiet hours delay everything that is not genuinely urgent.
    let deliverAt = draft.deliverAt ? new Date(draft.deliverAt) : now;
    if (deliverAt < now) deliverAt = now;
    const bypassQuiet = draft.priority === "security";
    if (!bypassQuiet && isWithinQuietHours(now, state.prefs.quietHours) && draft.priority !== "high") {
      deliverAt = quietHoursEnd(now, state.prefs.quietHours);
    }

    const notification: AppNotification = {
      id: newId(),
      dedupeKey: draft.dedupeKey,
      category: draft.category,
      prefKey: draft.prefKey,
      priority: draft.priority,
      title: draft.title,
      body: draft.body,
      createdAt: now.toISOString(),
      deliverAt: deliverAt.toISOString(),
      read: false,
      dismissed: false,
      actedOn: false,
      status: deliverAt > now ? "queued" : "sent",
      deliveries: [],
      payload: draft.payload,
      ...(draft.to ? { to: draft.to } : {}),
      actions: draft.actions ?? ["view"],
      ...(draft.groupKey ? { groupKey: draft.groupKey } : {}),
    };
    notification.deliveries = deliverAt > now ? [] : deliverAll(notification, context);

    existing.add(draft.dedupeKey);
    created.push(notification);
    if (!isCritical(draft.priority)) spent += 1;
  }

  const cooldowns = { ...state.cooldowns };
  for (const notification of created) {
    if (notification.payload.kind === "unallocated_money") {
      cooldowns["unallocated"] = { at: now.toISOString(), value: notification.payload.amountMinor };
    }
  }

  return {
    state: {
      ...state,
      notifications: [...created, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
      cooldowns,
      lastRunAt: now.toISOString(),
    },
    created,
    suppressed,
  };
}

/** Notifications the user can see right now. */
export function visibleNotifications(state: NotificationsState, now = new Date()): AppNotification[] {
  return state.notifications.filter((n) => !n.dismissed && new Date(n.deliverAt) <= now);
}

export function unreadCount(state: NotificationsState, now = new Date()): number {
  // Only meaningful items count, so the badge never inflates with old noise.
  return visibleNotifications(state, now).filter((n) => !n.read && !n.actedOn).length;
}

const FILTER_CATEGORIES: Record<Exclude<NotificationFilter, "unread" | "all">, string[]> = {
  financial: ["transactions", "organization", "protected", "upcoming"],
  goals: ["goals"],
  planning: ["reports", "upcoming"],
  agent: ["agent"],
};

export function filterNotifications(
  list: AppNotification[],
  filter: NotificationFilter,
): AppNotification[] {
  if (filter === "all") return list;
  if (filter === "unread") return list.filter((n) => !n.read);
  return list.filter((n) => FILTER_CATEGORIES[filter].includes(n.category));
}

function patch(
  state: NotificationsState,
  id: string,
  updater: (n: AppNotification) => AppNotification,
): NotificationsState {
  return { ...state, notifications: state.notifications.map((n) => (n.id === id ? updater(n) : n)) };
}

export function markRead(state: NotificationsState, id: string, now = new Date()): NotificationsState {
  const next = patch(state, id, (n) => ({
    ...n,
    read: true,
    status: "read",
    deliveries: [...n.deliveries, { channel: "inApp" as const, status: "read" as const, at: now.toISOString() }],
  }));
  return { ...next, interactions: { ...next.interactions, opened: next.interactions.opened + 1 } };
}

export function markAllRead(state: NotificationsState): NotificationsState {
  return {
    ...state,
    notifications: state.notifications.map((n) => (n.read ? n : { ...n, read: true, status: "read" })),
  };
}

/** Removing a notification never touches the financial event behind it. */
export function dismiss(state: NotificationsState, id: string): NotificationsState {
  const next = patch(state, id, (n) => ({ ...n, dismissed: true }));
  return { ...next, interactions: { ...next.interactions, dismissed: next.interactions.dismissed + 1 } };
}

export function markActed(state: NotificationsState, id: string, now = new Date()): NotificationsState {
  const next = patch(state, id, (n) => ({
    ...n,
    actedOn: true,
    read: true,
    status: "acted_on",
    deliveries: [...n.deliveries, { channel: "inApp" as const, status: "acted_on" as const, at: now.toISOString() }],
  }));
  return { ...next, interactions: { ...next.interactions, acted: next.interactions.acted + 1 } };
}

/** Snoozing moves the delivery time forward. It never creates a second notification. */
export function snooze(state: NotificationsState, id: string, until: Date): NotificationsState {
  return patch(state, id, (n) => ({
    ...n,
    read: false,
    dismissed: false,
    status: "queued",
    deliverAt: until.toISOString(),
  }));
}

export function registerDevice(
  state: NotificationsState,
  device: Omit<DeviceRegistration, "id" | "lastActiveAt">,
  now = new Date(),
): NotificationsState {
  const existing = state.devices.find((d) => d.token === device.token);
  if (existing) {
    return {
      ...state,
      devices: state.devices.map((d) =>
        d.token === device.token ? { ...d, ...device, lastActiveAt: now.toISOString() } : d,
      ),
    };
  }
  return {
    ...state,
    devices: [...state.devices, { ...device, id: newId(), lastActiveAt: now.toISOString() }],
  };
}

export function removeDevice(state: NotificationsState, id: string): NotificationsState {
  return { ...state, devices: state.devices.filter((d) => d.id !== id) };
}
