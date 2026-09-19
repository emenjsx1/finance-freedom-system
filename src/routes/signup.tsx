import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AuthShell, Field, LegalNotice, OrDivider, ProviderButtons } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { getSignedInDestination } from "@/lib/auth/destination";
import { notifyError } from "@/lib/ui/feedback";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar conta — Finan." },
      { name: "description", content: "Cria a tua conta Finan. com a Apple, a Google ou email." },
      { property: "og:title", content: "Criar conta — Finan." },
      { property: "og:description", content: "Começa a organizar o teu dinheiro em minutos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<null | "email" | "google" | "apple">(null);
  const [verifyFor, setVerifyFor] = useState<string | null>(null);

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
    if (password !== confirm) {
      notifyError("As palavras-passe não coincidem.");
      return;
    }
    setBusy("email");
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { preferred_name: name.trim(), full_name: name.trim() },
        },
      });
      if (error) throw error;
      if (data.session) {
        void navigate({ to: "/onboarding", replace: true });
        return;
      }
      setVerifyFor(email);
    } catch (error) {
      notifyError(authErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    if (!verifyFor) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: verifyFor });
    if (error) {
      notifyError(authErrorMessage(error));
      return;
    }
    toast.success("Enviámos outro email de confirmação.");
  }

  if (verifyFor) {
    return (
      <AuthShell>
        <h1 className="type-title">Confirma o teu email.</h1>
        <p className="type-secondary mt-3">
          Enviámos um link para <span className="font-medium text-foreground">{verifyFor}</span>. Abre-o
          para ativares a conta.
        </p>
        <div className="mt-8 space-y-3">
          <Button className="h-12 w-full" onClick={() => void resend()}>
            Reenviar email
          </Button>
          <Button variant="secondary" className="h-12 w-full" onClick={() => setVerifyFor(null)}>
            Alterar email
          </Button>
          <Link to="/auth" className="type-secondary block pt-2 text-center underline-offset-4 hover:underline">
            Voltar ao início de sessão
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="type-title">Cria a tua conta.</h1>
      <p className="type-secondary mt-3">Organiza o teu dinheiro com calma e clareza.</p>

      <div className="mt-9">
        <ProviderButtons busy={busy} onProvider={(provider) => void withOAuth(provider)} />
      </div>

      <OrDivider />

      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome preferido">
          <Input
            id="name"
            value={name}
            autoComplete="given-name"
            onChange={(e) => setName(e.target.value)}
            placeholder="Como queres ser tratado"
            required
          />
        </Field>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
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
          <p className="type-meta">Mínimo de 8 caracteres.</p>
        </Field>

        <Field label="Confirmar palavra-passe">
          <Input
            id="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </Field>

        <Button type="submit" className="h-12 w-full" disabled={busy !== null}>
          {busy === "email" ? <Loader2 className="animate-spin" /> : null}
          Criar conta
        </Button>
      </form>

      <LegalNotice />

      <p className="type-secondary mt-6 text-center">
        Já tens conta?{" "}
        <Link to="/auth" className="font-medium text-primary">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
