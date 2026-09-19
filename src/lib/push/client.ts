/**
 * Web Push client.
 *
 * The browser owns the subscription; the server owns delivery. This module
 * never signs or sends a push — the VAPID *private* key lives only on the
 * server. Without a configured public key we report `server_not_configured`
 * instead of pretending push works.
 */
import { supabase } from "@/integrations/supabase/client";

export type PushSupport =
  | "supported"
  | "unsupported_browser" // no Push API (e.g. iOS Safari outside an installed app)
  | "needs_install" // iOS: push only exists inside the installed app
  | "server_not_configured"; // no VAPID public key deployed yet

export type PushPermission = "default" | "granted" | "denied";

/**
 * VAPID *public* key. Public by design (the browser must send it to the push
 * service). The matching private key lives only in server secrets.
 */
const DEFAULT_VAPID_PUBLIC_KEY =
  "BPa8u0v8c2fzDBpGy3VQOYuwA67AQK56ZGOCVtR0bB82HCrqjR-mzTudBYYtOwqlX0Ctqy0PYje55IsZtpCvtSg";

export const VAPID_PUBLIC_KEY: string =
  (import.meta.env['VITE_VAPID_PUBLIC_KEY'] as string | undefined) || DEFAULT_VAPID_PUBLIC_KEY;

export function browserSupportsPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function pushSupport(standalone: boolean): PushSupport {
  if (!browserSupportsPush()) {
    return isIos() && !standalone ? "needs_install" : "unsupported_browser";
  }
  if (!VAPID_PUBLIC_KEY) return "server_not_configured";
  return "supported";
}

export function permissionState(): PushPermission {
  if (typeof Notification === "undefined") return "default";
  return Notification.permission as PushPermission;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function encodeKey(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function requestPermission(): Promise<PushPermission> {
  if (typeof Notification === "undefined") return "default";
  // Never re-prompt once the user said no — the browser would ignore it anyway.
  if (Notification.permission !== "default") return Notification.permission as PushPermission;
  return (await Notification.requestPermission()) as PushPermission;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!browserSupportsPush()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export interface SubscribeResult {
  ok: boolean;
  reason?: string;
}

/** Subscribes this device and stores the subscription against the signed-in user. */
export async function subscribeThisDevice(): Promise<SubscribeResult> {
  if (!browserSupportsPush()) return { ok: false, reason: "unsupported" };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "server_not_configured" };

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return { ok: false, reason: "no_service_worker" };

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "subscribe_failed" };
    }
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: json.keys?.['p256dh'] ?? encodeKey(subscription.getKey("p256dh")),
      auth: json.keys?.['auth'] ?? encodeKey(subscription.getKey("auth")),
      user_agent: navigator.userAgent.slice(0, 300),
      label: deviceLabel(),
      status: "active",
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function unsubscribeThisDevice(): Promise<SubscribeResult> {
  const subscription = await currentSubscription();
  if (!subscription) return { ok: true };
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Dispositivo";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Este dispositivo";
}

/** A local notification shown by this device — not a server push. */
export async function showLocalTestNotification(): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  await registration.showNotification("Notificação de teste", {
    body: "Assim é que um aviso vai aparecer neste dispositivo.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "test-notification",
    data: { url: "/app/notifications" },
  });
  return true;
}
