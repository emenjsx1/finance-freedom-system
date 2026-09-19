import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@tanstack/react-router";

import { registerServiceWorker, serviceWorkerAllowed } from "@/lib/pwa/register";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  | "installed" // already running standalone
  | "promptable" // the browser gave us an install event
  | "manual" // installable, but only through browser menu (iOS Safari)
  | "unsupported";

interface PwaValue {
  /** Running as an installed app. */
  standalone: boolean;
  installState: InstallState;
  /** iOS Safari cannot be prompted; we explain the Share → Add to Home Screen path. */
  iosSafari: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  online: boolean;
  updateReady: boolean;
  applyUpdate: () => void;
  serviceWorkerActive: boolean;
}

const PwaContext = createContext<PwaValue | null>(null);

function detectStandalone() {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayMode || iosStandalone;
}

function detectIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && webkit;
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [standalone, setStandalone] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [online, setOnline] = useState(true);
  const [updateReady, setUpdateReady] = useState(false);
  const [applyUpdateFn, setApplyUpdateFn] = useState<(() => void) | null>(null);
  const [swActive, setSwActive] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);

  useEffect(() => {
    setStandalone(detectStandalone());
    setIosSafari(detectIosSafari());
    setOnline(navigator.onLine);

    const media = window.matchMedia("(display-mode: standalone)");
    const onDisplay = () => setStandalone(detectStandalone());
    media.addEventListener("change", onDisplay);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      media.removeEventListener("change", onDisplay);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Registration is guarded: never in dev, preview, or an iframe.
  useEffect(() => {
    let cancelled = false;
    void registerServiceWorker((apply) => {
      if (cancelled) return;
      setUpdateReady(true);
      setApplyUpdateFn(() => apply);
    }).then((registered) => {
      if (!cancelled) setSwActive(registered);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A tapped notification navigates the existing window instead of opening a new one.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (data?.type !== "notification-click") return;
      const url = typeof data.url === "string" && data.url.startsWith("/app") ? data.url : "/app";
      void router.navigate({ to: url });
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome;
  }, [deferred]);

  const installState: InstallState = standalone
    ? "installed"
    : deferred
      ? "promptable"
      : iosSafari
        ? "manual"
        : serviceWorkerAllowed()
          ? "manual"
          : "unsupported";

  const value = useMemo<PwaValue>(
    () => ({
      standalone,
      installState,
      iosSafari,
      promptInstall,
      online,
      updateReady,
      applyUpdate: () => applyUpdateFn?.(),
      serviceWorkerActive: swActive,
    }),
    [standalone, installState, iosSafari, promptInstall, online, updateReady, applyUpdateFn, swActive],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("usePwa must be used inside PwaProvider");
  return context;
}
