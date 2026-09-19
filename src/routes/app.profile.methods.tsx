import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppleMark, GoogleMark } from "@/components/auth/provider-marks";
import { PageHeader } from "@/components/page-header";
import { SettingsGroup } from "@/components/design/settings-list";
import { Button } from "@/components/ui/button";
import { useAuth, type ProviderId } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { notifyError } from "@/lib/ui/feedback";

export const Route = createFileRoute("/app/profile/methods")({
  head: () => ({
    meta: [
      { title: "Métodos de acesso — Norte" },
      { name: "description", content: "Liga ou desliga Apple, Google e email na tua conta Norte." },
      { property: "og:title", content: "Métodos de acesso — Norte" },
      { property: "og:description", content: "Mais formas de entrar, mais segurança para recuperares o acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MethodsPage,
});

const METHODS: { id: ProviderId; label: string }[] = [
  { id: "apple", label: "Apple" },
  { id: "google", label: "Google" },
  { id: "email", label: "Email e palavra-passe" },
];

function MethodsPage() {
  const { user, providers, refreshProfile } = useAuth();
  const [busy, setBusy] = useState<ProviderId | null>(null);

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Métodos de acesso" subtitle="Inicia sessão para gerires os métodos de acesso." />
        <Button asChild>
          <Link to="/auth">Entrar</Link>
        </Button>
      </div>
    );
  }

  async function connect(provider: ProviderId) {
    if (provider === "email") return;
    setBusy(provider);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/app/profile/methods` },
      });
      if (error) throw error;
    } catch (error) {
      notifyError(authErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: ProviderId) {
    // Never let anyone remove their only way back in.
    if (providers.length <= 1) {
      notifyError("Não podes remover o teu único método de acesso.");
      return;
    }
    setBusy(provider);
    try {
      const identity = user?.identities?.find((i) => i.provider === provider);
      if (!identity) throw new Error("identity not found");
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      toast.success("Método de acesso removido.");
      await refreshProfile();
      await supabase.auth.refreshSession();
    } catch (error) {
      notifyError(authErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Métodos de acesso"
        subtitle="Quantas mais formas de entrar tiveres, mais fácil é recuperar o acesso."
      />

      <SettingsGroup>
        {METHODS.map((method) => {
          const connected = providers.includes(method.id);
          return (
            <div key={method.id} className="list-row items-center gap-3">
              <span className="icon-tile size-9">
                {method.id === "apple" ? (
                  <AppleMark />
                ) : method.id === "google" ? (
                  <GoogleMark />
                ) : (
                  <KeyRound className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem]">{method.label}</span>
                <span className={connected ? "type-meta text-primary" : "type-meta"}>
                  {connected ? "Ligado" : "Não configurado"}
                </span>
              </span>
              {method.id === "email" ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/app/profile/password">{connected ? "Alterar" : "Definir"}</Link>
                </Button>
              ) : connected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null || providers.length <= 1}
                  onClick={() => void disconnect(method.id)}
                >
                  {busy === method.id ? <Loader2 className="animate-spin" /> : null}
                  Desligar
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void connect(method.id)}
                >
                  {busy === method.id ? <Loader2 className="animate-spin" /> : null}
                  Ligar
                </Button>
              )}
            </div>
          );
        })}
      </SettingsGroup>

      <p className="type-meta">
        Nunca guardamos palavras-passe nem identificadores dos fornecedores. Tudo acontece no fluxo
        seguro de cada serviço.
      </p>
    </div>
  );
}
