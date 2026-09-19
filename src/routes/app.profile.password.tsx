import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { notifyError } from "@/lib/ui/feedback";

export const Route = createFileRoute("/app/profile/password")({
  head: () => ({
    meta: [
      { title: "Palavra-passe — Norte" },
      { name: "description", content: "Alterar ou definir a palavra-passe da tua conta Norte." },
      { property: "og:title", content: "Palavra-passe — Norte" },
      { property: "og:description", content: "Gere a palavra-passe da tua conta em segurança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PasswordPage,
});

function PasswordPage() {
  const { user, providers, refreshProfile } = useAuth();
  const hasPassword = providers.includes("email");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Palavra-passe" subtitle="Inicia sessão para gerires a palavra-passe." />
        <Button asChild>
          <Link to="/auth">Entrar</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (next !== confirm) {
      notifyError("As palavras-passe não coincidem.");
      return;
    }
    setBusy(true);
    try {
      // Social-only accounts never created a password: never ask for an old one.
      const attributes: Record<string, unknown> = { password: next };
      if (hasPassword) attributes['current_password'] = current;

      const { error } = await supabase.auth.updateUser(
        attributes as Parameters<typeof supabase.auth.updateUser>[0],
      );
      if (error) throw error;

      toast.success("A palavra-passe foi atualizada.");
      setCurrent("");
      setNext("");
      setConfirm("");
      await refreshProfile();
    } catch (error) {
      notifyError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title={hasPassword ? "Alterar palavra-passe" : "Definir palavra-passe"}
        subtitle={
          hasPassword
            ? "Escolhe algo novo e só teu. Mínimo de 8 caracteres."
            : "Entraste com Apple ou Google. Podes criar uma palavra-passe para teres outra forma de entrar."
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {hasPassword ? (
          <div className="space-y-2">
            <Label className="type-meta">Palavra-passe atual</Label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label className="type-meta">Nova palavra-passe</Label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              aria-label={show ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="type-meta">Pelo menos 8 caracteres. Evita algo que uses noutro sítio.</p>
        </div>

        <div className="space-y-2">
          <Label className="type-meta">Confirmar nova palavra-passe</Label>
          <Input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <Button type="submit" className="h-12 w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          Alterar palavra-passe
        </Button>
      </form>
    </div>
  );
}
