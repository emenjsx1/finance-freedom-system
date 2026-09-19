/**
 * Delivery channel adapters.
 *
 * notification event → notification service → channel adapter
 *
 * Business logic never knows which platform delivered anything. In-app is the
 * reliable default: even when push or email fail, the notification stays in
 * the notification centre.
 */
import type {
  AppNotification,
  Channel,
  Delivery,
  DeviceRegistration,
  NotificationPrefs,
  PreviewPrivacy,
} from "./types";

export interface ChannelAdapter {
  channel: Channel;
  available(context: DeliveryContext): boolean;
  deliver(notification: AppNotification, context: DeliveryContext): Delivery;
}

export interface DeliveryContext {
  prefs: NotificationPrefs;
  devices: DeviceRegistration[];
  now: Date;
  /** Set when an email destination is configured. */
  email?: string | undefined;
}

/** Lock-screen text. Privacy settings decide how much may leave the app. */
export function previewText(
  notification: AppNotification,
  privacy: PreviewPrivacy,
): { title: string; body: string } {
  if (privacy === "private") {
    return { title: "Personal Norte", body: "Tens uma nova atualização financeira." };
  }
  if (privacy === "hide_amounts") {
    return { title: stripAmounts(notification.title), body: stripAmounts(notification.body) };
  }
  return { title: notification.title, body: notification.body };
}

/** Removes every number group so no amount can be read from the lock screen. */
export function stripAmounts(text: string): string {
  return text
    .replace(/[-+]?[\p{Sc}A-Z]{0,3}\s?\d[\d\s.,]*\s?(?:[\p{Sc}]|MT|MZN|ZAR|USD|EUR|GBP|TRY|%)?/gu, "•••")
    .replace(/(•••\s*)+/g, "••• ")
    .trim();
}

const inAppAdapter: ChannelAdapter = {
  channel: "inApp",
  available: () => true,
  deliver: (_notification, { now }) => ({ channel: "inApp", status: "delivered", at: now.toISOString() }),
};

const pushAdapter: ChannelAdapter = {
  channel: "push",
  available: ({ devices }) => devices.some((d) => d.enabled),
  deliver: (notification, { devices, prefs, now }) => {
    const device = devices.find((d) => d.enabled);
    if (!device) {
      return {
        channel: "push",
        status: "failed",
        at: now.toISOString(),
        detail: "no_registered_device",
      };
    }
    // The payload that would leave the device respects the preview privacy setting.
    const preview = previewText(notification, prefs.preview);
    return {
      channel: "push",
      status: "queued",
      at: now.toISOString(),
      detail: `${device.platform}:${preview.title}`,
    };
  },
};

const emailAdapter: ChannelAdapter = {
  channel: "email",
  available: ({ email }) => Boolean(email),
  deliver: (_notification, { email, now }) =>
    email
      ? { channel: "email", status: "queued", at: now.toISOString(), detail: "email_adapter" }
      : { channel: "email", status: "failed", at: now.toISOString(), detail: "no_email_configured" },
};

export const ADAPTERS: ChannelAdapter[] = [inAppAdapter, pushAdapter, emailAdapter];

export function deliverAll(notification: AppNotification, context: DeliveryContext): Delivery[] {
  const wanted = context.prefs.categories[notification.prefKey];
  const out: Delivery[] = [];
  for (const adapter of ADAPTERS) {
    if (!wanted?.[adapter.channel]) continue;
    if (!adapter.available(context)) {
      out.push({
        channel: adapter.channel,
        status: "failed",
        at: context.now.toISOString(),
        detail: "channel_unavailable",
      });
      continue;
    }
    out.push(adapter.deliver(notification, context));
  }
  if (!out.some((d) => d.channel === "inApp")) {
    // In-app always records the event, so nothing important is ever lost.
    out.push({ channel: "inApp", status: "delivered", at: context.now.toISOString() });
  }
  return out;
}
