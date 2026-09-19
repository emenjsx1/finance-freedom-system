import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { AuthShell, Field, LegalNotice, OrDivider, ProviderButtons } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { getSignedInDestination } from "@/lib/auth/destination";
import { notifyError } from "@/lib/ui/feedback";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Norte" },
      { name: "description", content: "Entra na tua conta Norte: Apple, Google ou email." },
      { property: "og:title", content: "Entrar — Norte" },
      { property: "og:description", content: "O teu dinheiro, os teus planos, num só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<null | "email" | "google" | "apple">(null);

  useEffect(() => {
    if (!loading && session) {
      void getSignedInDestination().then((to) => navigate({ to, replace: true }));
    }
  }, [loading, session, navigate]);

  async function withOAuth(provider: "apple" | "google") {
    setBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        notifyError(authErrorMessage(result.error));
        return;
      }
      if (result.redirected) return;
      const to = await getSignedInDestination();
      void navigate({ to, replace: true });
    } catch (error) {
      notifyError(authErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const to = await getSignedInDestination();
      void navigate({ to, replace: true });
    } catch (error) {
      notifyError(authErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthShell>
      <h1 className="type-title">Bem-vindo de volta.</h1>
      <p className="type-secondary mt-3">O teu dinheiro, os teus planos, num só lugar.</p>

      <div className="mt-9">
        <ProviderButtons busy={busy} onProvider={(provider) => void withOAuth(provider)} />
      </div>

      <OrDivider />

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@exemplo.com"
            required
          />
        </Field>

        <Field label="Palavra-passe">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <Button type="submit" className="h-12 w-full" disabled={busy !== null}>
          {busy === "email" ? <Loader2 className="animate-spin" /> : null}
          Entrar
        </Button>
      </form>

      <div className="mt-7 space-y-3 text-center">
        <Link to="/forgot-password" className="type-secondary underline-offset-4 hover:underline">
          Esqueceste a palavra-passe?
        </Link>
        <p className="type-secondary">
          Não tens conta?{" "}
          <Link to="/signup" className="font-medium text-primary">
            Criar conta
          </Link>
        </p>
      </div>

      <LegalNotice />
    </AuthShell>
  );
}
