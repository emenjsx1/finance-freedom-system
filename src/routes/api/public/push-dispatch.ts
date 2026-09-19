/**
 * Scheduled push dispatcher.
 *
 * Called by the database scheduler every minute with a shared token. It finds
 * reminders whose time has arrived, respects each person's notification
 * preferences (master switch, push channel, quiet hours, preview privacy) and
 * delivers one Web Push per active device. Nothing here invents a reminder and
 * nothing is marked as delivered unless the push provider accepted it.
 */
import { createFileRoute } from "@tanstack/react-router";

import { sendWebPush, type VapidConfig } from "@/lib/push/webpush.server";

interface ReminderRow {
  id: string;
  user_id: string;
  title: string | null;
  scheduled_at: string;
  timezone: string | null;
  payload: Record<string, unknown> | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** "HH:MM" in the given IANA zone. */
function localTime(zone: string, at: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(at);
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(at);
  }
}

function inQuietHours(now: string, start: string, end: string): boolean {
  if (start === end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end;
}

export const Route = createFileRoute("/api/public/push-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: config } = await supabaseAdmin
          .from("cron_config")
          .select("value")
          .eq("key", "push_dispatch_token")
          .maybeSingle();
        const expected = (config?.["value"] as string | undefined) ?? "";
        const provided = request.headers.get("x-cron-token") ?? "";
        if (!expected || !timingSafeEqual(provided, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const vapid: VapidConfig = {
          publicKey: process.env["VAPID_PUBLIC_KEY"] ?? "",
          privateJwk: process.env["VAPID_PRIVATE_JWK"] ?? "",
          subject: process.env["VAPID_SUBJECT"] ?? "mailto:no-reply@lovable.app",
        };
        if (!vapid.publicKey || !vapid.privateJwk) {
          return Response.json({ ok: false, reason: "vapid_not_configured" }, { status: 503 });
        }

        const now = new Date();
        const { data: due, error } = await supabaseAdmin
          .from("reminders")
          .select("id, user_id, title, scheduled_at, timezone, payload, last_push_at")
          .eq("status", "scheduled")
          .lte("scheduled_at", now.toISOString())
          .is("last_push_at", null)
          .limit(200);

        if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });

        const reminders = (due ?? []) as unknown as ReminderRow[];
        if (reminders.length === 0) return Response.json({ ok: true, sent: 0, due: 0 });

        const userIds = [...new Set(reminders.map((r) => r.user_id))];

        const [{ data: settingsRows }, { data: subRows }] = await Promise.all([
          supabaseAdmin.from("user_settings").select("user_id, appearance").in("user_id", userIds),
          supabaseAdmin
            .from("push_subscriptions")
            .select("id, user_id, endpoint, p256dh, auth")
            .in("user_id", userIds)
            .eq("status", "active"),
        ]);

        const settingsByUser = new Map<string, Record<string, unknown>>();
        for (const row of (settingsRows ?? []) as unknown as {
          user_id: string;
          appearance: Record<string, unknown> | null;
        }[]) {
          const blob = (row.appearance ?? {}) as Record<string, unknown>;
          const notifications = (blob["notifications"] ?? {}) as Record<string, unknown>;
          // Preferences live inside the notifications blob written by the app.
          settingsByUser.set(row.user_id, (notifications["prefs"] ?? {}) as Record<string, unknown>);
        }

        const subsByUser = new Map<string, SubscriptionRow[]>();
        for (const row of (subRows ?? []) as unknown as SubscriptionRow[]) {
          const list = subsByUser.get(row.user_id) ?? [];
          list.push(row);
          subsByUser.set(row.user_id, list);
        }

        let sent = 0;
        const handled: string[] = [];
        const deliveries: Record<string, unknown>[] = [];
        const revoke: string[] = [];

        for (const reminder of reminders) {
          const prefs = settingsByUser.get(reminder.user_id) ?? {};
          const categories = (prefs["categories"] ?? {}) as Record<
            string,
            { push?: boolean } | undefined
          >;
          const quiet = (prefs["quietHours"] ?? {}) as {
            enabled?: boolean;
            start?: string;
            end?: string;
          };
          const zone =
            reminder.timezone ?? ((prefs["timezone"] as string | undefined) || "UTC");

          const masterOn = prefs["enabled"] !== false;
          const channelOn = categories["reminders"]?.push !== false;
          const reminderPush =
            ((reminder.payload?.["channels"] as { push?: boolean } | undefined)?.push ?? true) !==
            false;

          if (!masterOn || !channelOn || !reminderPush) {
            handled.push(reminder.id);
            continue;
          }

          if (
            quiet.enabled &&
            quiet.start &&
            quiet.end &&
            inQuietHours(localTime(zone, now), quiet.start, quiet.end)
          ) {
            // Stays pending: it is delivered when the quiet window closes.
            continue;
          }

          const subs = subsByUser.get(reminder.user_id) ?? [];
          if (subs.length === 0) {
            handled.push(reminder.id);
            continue;
          }

          const preview = (prefs["preview"] as string | undefined) ?? "details";
          const title =
            preview === "private" ? "Tens um lembrete" : (reminder.title ?? "Lembrete");
          const description = reminder.payload?.["description"];
          const body =
            preview === "details" && typeof description === "string" && description
              ? description
              : "Toca para abrir na app.";
          const to = reminder.payload?.["to"];

          let anyOk = false;
          for (const sub of subs) {
            const result = await sendWebPush(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              {
                title,
                body,
                tag: `reminder-${reminder.id}`,
                url: typeof to === "string" ? to : "/app/reminders",
                notificationId: reminder.id,
              },
              vapid,
            );

            if (result.ok) {
              anyOk = true;
              sent += 1;
            } else if (result.gone) {
              revoke.push(sub.id);
            }

            deliveries.push({
              user_id: reminder.user_id,
              subscription_id: sub.id,
              reminder_id: reminder.id,
              title,
              status: result.ok ? "sent" : result.gone ? "revoked" : "failed",
              http_status: result.status,
              error: result.error ?? null,
            });
          }

          if (anyOk || subs.every((s) => revoke.includes(s.id))) handled.push(reminder.id);
        }

        if (handled.length > 0) {
          await supabaseAdmin
            .from("reminders")
            .update({ last_push_at: now.toISOString() })
            .in("id", handled);
        }
        if (revoke.length > 0) {
          await supabaseAdmin
            .from("push_subscriptions")
            .update({ status: "revoked", last_error: "endpoint_gone" })
            .in("id", revoke);
        }
        if (deliveries.length > 0) {
          await supabaseAdmin.from("push_deliveries").insert(deliveries as never);
        }

        return Response.json({ ok: true, due: reminders.length, sent });
      },
    },
  },
});
