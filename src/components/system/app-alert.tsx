import { useEffect, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ALERT_EVENT, type AppAlertPayload } from "@/lib/ui/feedback";

/**
 * Single place where failures are shown. A centred card in the product's own
 * language, dismissed deliberately with [X] or [Entendi] — never a system
 * looking strip that disappears before it is read.
 */
export function AppAlertHost() {
  const [alert, setAlert] = useState<AppAlertPayload | null>(null);

  useEffect(() => {
    function onAlert(event: Event) {
      const detail = (event as CustomEvent<AppAlertPayload>).detail;
      if (detail) setAlert(detail);
    }
    window.addEventListener(APP_ALERT_EVENT, onAlert);
    return () => window.removeEventListener(APP_ALERT_EVENT, onAlert);
  }, []);

  useEffect(() => {
    if (!alert) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAlert(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alert]);

  if (!alert) return null;

  const Icon = alert.tone === "info" ? Info : AlertTriangle;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={alert.title}
      className="fixed inset-0 z-[120] flex items-center justify-center px-5"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={() => setAlert(null)}
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-[var(--r-lg,1.25rem)] border border-border/70 bg-surface p-6 shadow-2xl">
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={() => setAlert(null)}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={
            alert.tone === "info"
              ? "flex h-11 w-11 items-center justify-center rounded-full bg-primary/12 text-primary"
              : "flex h-11 w-11 items-center justify-center rounded-full bg-destructive/12 text-destructive"
          }
        >
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="mt-4 text-[1.0625rem] font-semibold leading-snug text-foreground">{alert.title}</h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{alert.message}</p>

        <Button className="mt-6 h-12 w-full" onClick={() => setAlert(null)}>
          Entendi
        </Button>
      </div>
    </div>
  );
}
