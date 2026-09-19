import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, Link2, Lock, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { SettingsGroup, SettingsRow } from "@/components/design/settings-list";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { usePrefs } from "@/hooks/use-prefs";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { notifyError } from "@/lib/ui/feedback";

export const Route = createFileRoute("/app/profile/security")({
  head: () => ({
    meta: [
      { title: "Acesso e segurança — Finance OS" },
      { name: "description", content: "Métodos de acesso, palavra-passe, dispositivos, bloqueio da app e atividade." },
      { property: "og:title", content: "Acesso e segurança — Finance OS" },
      { property: "og:description", content: "Controla como entras e como proteges a aplicação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

const PROVIDER_LABEL: Record<string, string> = {
  email: "Email e palavra-passe",
  google: "Google",
  apple: "Apple",
};

function SecurityPage() {
  const { user, providers } = useAuth();
  const { prefs, update } = usePrefs();
  const navigate = useNavigate();
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBiometricsAvailable("PublicKeyCredential" in window);
  }, []);

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Acesso e segurança" subtitle="Inicia sessão para gerires o acesso à tua conta." />
        <Button asChild>
          <Link to="/auth">Entrar</Link>
        </Button>
      </div>
    );
  }

  const hasPassword = providers.includes("email");

  async function signOutEverywhere() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      toast.success("Sessão terminada em todos os dispositivos.");
      void navigate({ to: "/auth", replace: true });
    } catch (error) {
      notifyError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader title="Acesso e segurança" subtitle="Como entras e como proteges o que é teu." />

      <SettingsGroup title="Métodos de acesso" footer="Mantém pelo menos dois métodos para nunca perderes o acesso.">
        {(["apple", "google", "email"] as const).map((provider) => (
          <SettingsRow
            key={provider}
            icon={provider === "email" ? KeyRound : ShieldCheck}
            label={PROVIDER_LABEL[provider] ?? provider}
            trailing={
              <span className={providers.includes(provider) ? "type-meta text-primary" : "type-meta"}>
                {providers.includes(provider) ? "Ligado" : "Não configurado"}
              </span>
            }
          />
        ))}
        <SettingsRow icon={Link2} label="Gerir métodos de acesso" to="/app/profile/methods" />
      </SettingsGroup>

      <SettingsGroup title="Palavra-passe">
        <SettingsRow
          icon={KeyRound}
          label={hasPassword ? "Alterar palavra-passe" : "Definir palavra-passe"}
          to="/app/profile/password"
        />
      </SettingsGroup>

      <SettingsGroup title="Dispositivos">
        <SettingsRow
          icon={MonitorSmartphone}
          label="Este dispositivo"
          trailing={<span className="type-meta">Sessão ativa</span>}
        />
        <SettingsRow
          icon={Lock}
          label="Terminar sessão em todos os dispositivos"
          destructive
          onSelect={() => void signOutEverywhere()}
        />
      </SettingsGroup>

      <SettingsGroup
        title="Bloqueio da aplicação"
        footer="O bloqueio usa a proteção do teu dispositivo. Nada sai do telemóvel."
      >
        <SettingsRow
          icon={Lock}
          label="Pedir autenticação ao abrir"
          trailing={
            <Switch
              checked={prefs.appLock}
              aria-label="Bloqueio da aplicação"
              onCheckedChange={(checked) => update({ appLock: checked })}
            />
          }
        />
        <SettingsRow
          icon={Fingerprint}
          label={biometricsAvailable ? "Usar biometria" : "Biometria indisponível neste dispositivo"}
          trailing={
            <Switch
              checked={prefs.appLockBiometrics && biometricsAvailable}
              disabled={!biometricsAvailable || !prefs.appLock}
              aria-label="Usar biometria"
              onCheckedChange={(checked) => update({ appLockBiometrics: checked })}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Atividade de segurança">
        <SettingsRow
          label="Conta criada"
          trailing={<span className="type-meta">{formatDate(user.created_at)}</span>}
        />
        <SettingsRow
          label="Última entrada"
          trailing={<span className="type-meta">{formatDate(user.last_sign_in_at)}</span>}
        />
        <SettingsRow
          label="Email"
          trailing={<span className="type-meta">{user.email_confirmed_at ? "Verificado" : "Por verificar"}</span>}
        />
      </SettingsGroup>

      {busy ? <p className="type-meta">A terminar sessões…</p> : null}
    </div>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
