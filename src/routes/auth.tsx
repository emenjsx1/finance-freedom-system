import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppleMark, GoogleMark } from "@/components/auth/provider-marks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Finance OS" },
      { name: "description", content: "Entra na tua conta Finance OS: Apple, Google ou email." },
      { property: "og:title", content: "Entrar — Finance OS" },
      { property: "og:description", content: "O teu dinheiro, os teus planos, num só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<null | "email" | "google" | "apple">(null);
  const [sent, setSent] = useState<null | "verify" | "recovery">(null);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/app", replace: true });
  }, [loading, session, navigate]);

  async function withOAuth(provider: "google" | "apple") {
    setBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(authErrorMessage(result.error));
        return;
      }
      if (result.redirected) return;
      void navigate({ to: "/app", replace: true });
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: "/app", replace: true });
        return;
      }

      if (mode === "signup") {
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
          void navigate({ to: "/app", replace: true });
          return;
        }
        setSent("verify");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent("recovery");
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  if (sent) {
    return (
      <Shell>
        <h1 className="type-title">{sent === "verify" ? "Confirma o teu email." : "Verifica o teu email."}</h1>
        <p className="type-secondary mt-3">
          {sent === "verify"
            ? `Enviámos um link de confirmação para ${email}. Abre-o para ativares a conta.`
            : "Se existir uma conta com esse email, enviámos as instruções para redefinir a palavra-passe."}
        </p>
        <Button
          variant="secondary"
          className="mt-8 w-full"
          onClick={() => {
            setSent(null);
            setMode("signin");
          }}
        >
          Voltar a entrar
        </Button>
      </Shell>
    );
  }

  if (mode === "forgot") {
    return (
      <Shell>
        <h1 className="type-title">Recuperar acesso</h1>
        <p className="type-secondary mt-3">
          Introduz o teu email e enviaremos as instruções para redefinir a tua palavra-passe.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@exemplo.com"
              required
            />
          </Field>
          <Button type="submit" className="h-12 w-full" disabled={busy !== null}>
            {busy === "email" ? <Loader2 className="animate-spin" /> : null}
            Enviar instruções
          </Button>
        </form>
        <button
          type="button"
          className="type-secondary mt-6 w-full text-center underline-offset-4 hover:underline"
          onClick={() => setMode("signin")}
        >
          Voltar a entrar
        </button>
      </Shell>
    );
  }

  const isSignup = mode === "signup";

  return (
    <Shell>
      <h1 className="type-title">{isSignup ? "Vamos começar." : "Bem-vindo de volta."}</h1>
      <p className="type-secondary mt-3">O teu dinheiro, os teus planos, num só lugar.</p>

      <div className="mt-9 space-y-3">
        <Button
          type="button"
          variant="secondary"
          className="h-12 w-full justify-center gap-2.5"
          disabled={busy !== null}
          onClick={() => void withOAuth("apple")}
        >
          {busy === "apple" ? <Loader2 className="animate-spin" /> : <AppleMark />}
          Continuar com a Apple
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-12 w-full justify-center gap-2.5"
          disabled={busy !== null}
          onClick={() => void withOAuth("google")}
        >
          {busy === "google" ? <Loader2 className="animate-spin" /> : <GoogleMark />}
          Continuar com Google
        </Button>
      </div>

      <div className="my-7 flex items-center gap-4">
        <span className="h-px flex-1 bg-border/70" />
        <span className="type-meta">ou</span>
        <span className="h-px flex-1 bg-border/70" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignup ? (
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
        ) : null}

        <Field label="Email">
          <Input
            id="email"
            type="email"
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
              autoComplete={isSignup ? "new-password" : "current-password"}
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
        </Field>

        <Button type="submit" className="h-12 w-full" disabled={busy !== null}>
          {busy === "email" ? <Loader2 className="animate-spin" /> : null}
          {isSignup ? "Criar conta" : "Entrar"}
        </Button>
      </form>

      <div className="mt-7 space-y-3 text-center">
        {!isSignup ? (
          <button
            type="button"
            className="type-secondary underline-offset-4 hover:underline"
            onClick={() => setMode("forgot")}
          >
            Esqueceste a palavra-passe?
          </button>
        ) : null}
        <p className="type-secondary">
          {isSignup ? "Já tens conta?" : "Não tens conta?"}{" "}
          <button
            type="button"
            className="font-medium text-primary"
            onClick={() => setMode(isSignup ? "signin" : "signup")}
          >
            {isSignup ? "Entrar" : "Criar conta"}
          </button>
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-background px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),2rem)]">
      <div className="mx-auto w-full max-w-sm">
        <Link
          to="/"
          aria-label="Finance OS"
          className="mb-8 grid size-10 place-items-center rounded-[var(--r-md)] bg-accent text-accent-foreground"
        >
          <span aria-hidden>◈</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="type-meta">{label}</Label>
      {children}
    </div>
  );
}
