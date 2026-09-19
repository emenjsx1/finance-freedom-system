/* eslint-disable no-undef */
/**
 * Push + notification click handling.
 *
 * Imported by the generated Workbox service worker. Contains NO secrets:
 * VAPID private keys and any delivery credentials live server-side only.
 *
 * Payload contract (JSON):
 *   { title, body, tag, url, notificationId, renotify }
 * `url` is validated against same-origin app routes before it is opened.
 */

const FALLBACK_TITLE = "Finan.";
const FALLBACK_BODY = "Tens uma nova atualização.";

function safePath(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return "/app";
  // Only internal app routes are ever opened from a notification.
  if (!raw.startsWith("/app")) return "/app";
  return raw;
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : undefined };
  }

  const title = typeof data.title === "string" && data.title ? data.title : FALLBACK_TITLE;
  const options = {
    body: typeof data.body === "string" && data.body ? data.body : FALLBACK_BODY,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: typeof data.tag === "string" ? data.tag : undefined,
    renotify: data.renotify === true,
    data: {
      url: safePath(data.url),
      notificationId: typeof data.notificationId === "string" ? data.notificationId : null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safePath(event.notification.data && event.notification.data.url);
  const notificationId =
    (event.notification.data && event.notification.data.notificationId) || null;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          client.postMessage({ type: "notification-click", url: target, notificationId });
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
