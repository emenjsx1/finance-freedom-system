/**
 * Avisos no telemóvel (Web Push).
 *
 * Honest by construction: the panel reports exactly what this device can do.
 * It never claims a reminder will arrive when the browser blocked it, when the
 * platform cannot do it, or when the delivery service is not configured yet.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, Download, ShieldAlert, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePwa } from "@/hooks/use-pwa";
import {
  currentSubscription,
  deviceLabel,
  permissionState,
  pushSupport,
  requestPermission,
  showLocalTestNotification,
  subscribeThisDevice,
  unsubscribeThisDevice,
  type PushPermission,
  type PushSupport,
} from "@/lib/push/client";

const SUPPORT_COPY: Record<PushSupport, string> = {
  supported: "Este dispositivo pode receber avisos mesmo com a app fechada.",
  unsupported_browser: "Este navegador não suporta avisos fora da app. Tudo continua a aparecer aqui dentro.",
  needs_install:
    "Neste iPhone, os avisos fora da app só existem depois de a instalares no ecrã principal: Partilhar › Adicionar ao ecrã principal.",
  server_not_configured:
    "O envio de avisos ainda não está ligado do lado do servidor. Os lembretes e avisos continuam a aparecer dentro da app — não te prometo o que ainda não consigo entregar.",
};

export function PushPanel() {
  const { standalone, installState, promptInstall, serviceWorkerActive } = usePwa();
  const [permission, setPermission] = useState<PushPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const support = pushSupport(standalone);

  const refresh = useCallback(async () => {
    setPermission(permissionState());
    setSubscribed((await currentSubscription()) !== null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enable() {
    setBusy(true);
    try {
      const granted = await requestPermission();
      setPermission(granted);
      if (granted !== "granted") {
        toast.info("Sem autorização, os avisos ficam só dentro da app.");
        return;
      }
      if (support !== "supported") {
        toast.info("Autorização dada. O envio fora da app ainda não está disponível neste dispositivo.");
        return;
      }
      const result = await subscribeThisDevice();
      if (!result.ok) {
        toast.error("Não consegui ativar os avisos neste dispositivo.");
        return;
      }
      setSubscribed(true);
      toast.success("Este dispositivo vai receber avisos.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    const result = await unsubscribeThisDevice();
    setBusy(false);
    if (!result.ok) {
      toast.error("Não consegui desativar os avisos neste dispositivo.");
      return;
    }
    setSubscribed(false);
    toast.success("Este dispositivo deixou de receber avisos.");
  }

  async function test() {
    const shown = await showLocalTestNotification();
    if (!shown) toast.info("Autoriza primeiro os avisos para veres o teste.");
  }

  return (
    <div className="space-y-4">
      <p className="type-secondary flex items-start gap-2">
        <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden />
        {SUPPORT_COPY[support]}
      </p>

      {permission === "denied" ? (
        <p className="type-secondary flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Bloqueaste os avisos para este site. Só podes voltar atrás nas definições do navegador —
          daqui não te posso voltar a perguntar.
        </p>
      ) : null}

      {installState === "promptable" && !standalone ? (
        <Button
          variant="secondary"
          className="min-h-12 w-full"
          onClick={() => void promptInstall()}
        >
          <Download className="size-4" />
          Instalar a app neste dispositivo
        </Button>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {subscribed ? (
          <Button variant="secondary" className="min-h-12" disabled={busy} onClick={() => void disable()}>
            Desativar neste dispositivo
          </Button>
        ) : (
          <Button
            className="min-h-12"
            disabled={busy || permission === "denied"}
            onClick={() => void enable()}
          >
            <BellRing className="size-4" />
            Ativar avisos neste dispositivo
          </Button>
        )}
        {permission === "granted" ? (
          <Button variant="ghost" className="min-h-12" onClick={() => void test()}>
            Ver um aviso de teste
          </Button>
        ) : null}
      </div>

      <p className="type-meta">
        {deviceLabel()} ·{" "}
        {subscribed
          ? "avisos ativos"
          : permission === "granted"
            ? "autorizado, sem envio fora da app"
            : "só dentro da app"}
        {serviceWorkerActive ? " · app instalável ativa" : ""}
      </p>
    </div>
  );
}
