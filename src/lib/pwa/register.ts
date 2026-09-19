/**
 * Service worker registration wrapper.
 *
 * The worker must never register in dev, inside the Lovable preview iframe, or
 * on a preview host — a stale worker there would serve deleted chunks. In any
 * refused context we actively unregister a worker that is already installed.
 */

const SW_URL = "/sw.js";

function previewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

export function serviceWorkerAllowed(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (previewHost(window.location.hostname)) return false;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return false;
  return true;
}

async function unregisterExisting() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export type UpdateHandler = (applyUpdate: () => void) => void;

/** Registers the worker when allowed; otherwise cleans up. Returns true when registered. */
export async function registerServiceWorker(onUpdate?: UpdateHandler): Promise<boolean> {
  if (!serviceWorkerAllowed()) {
    await unregisterExisting();
    return false;
  }

  try {
    const { registerSW } = await import("virtual:pwa-register");
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        onUpdate?.(() => void updateSW(true));
      },
    });
    return true;
  } catch (error) {
    console.error("Service worker registration failed", error);
    return false;
  }
}
