/**
 * Connection and app-version status.
 *
 * Offline is stated plainly — the app never pretends a change was saved while
 * there is no connection. Updates are offered once, not repeatedly.
 */
import { useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePwa } from "@/hooks/use-pwa";

export function AppStatus() {
  const { online, updateReady, applyUpdate } = usePwa();
  const [dismissed, setDismissed] = useState(false);

  if (!online) {
    return (
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-sm text-background"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)" }}
      >
        <CloudOff className="size-4" aria-hidden />
        Sem ligação. Podes ver o que já está aqui; nada novo é guardado até voltares a ficar online.
      </div>
    );
  }

  if (!updateReady || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 z-50 flex items-center justify-between gap-3 rounded-[var(--r-card)] border border-border bg-elevated px-4 py-3 shadow-[var(--shadow-raised)]"
      style={{ bottom: "calc(6.75rem + env(safe-area-inset-bottom))" }}
    >
      <p className="type-secondary">Nova versão disponível.</p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setDismissed(true)}>
          Agora não
        </Button>
        <Button size="sm" className="min-h-11" onClick={applyUpdate}>
          <RefreshCw className="size-4" />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
