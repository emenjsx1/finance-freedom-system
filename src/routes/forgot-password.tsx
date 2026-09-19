import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { AuthShell, Field } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { notifyError } from "@/lib/ui/feedback";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar acesso — Finan." },
      { name: "description", content: "Recebe instruções para definir uma nova palavra-passe." },
      { property: "og:title", content: "Recuperar acesso — Finan." },
      { property: "og:description", content: "Volta a entrar na tua conta Finan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      // Never reveal whether the address belongs to an account.
      setSent(true);
    } catch (error) {
      notifyError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell>
        <h1 className="type-title">Verifica o teu email.</h1>
        <p className="type-secondary mt-3">
          Se existir uma conta associada a esse email, enviámos as instruções para definires uma nova
          palavra-passe.
        </p>
        <Link to="/auth" className="mt-8 block">
          <Button variant="secondary" className="h-12 w-full">
            Voltar a entrar
          </Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="type-title">Recuperar acesso</h1>
      <p className="type-secondary mt-3">
        Introduz o teu email e enviaremos as instruções para redefinir a tua palavra-passe.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
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
        <Button type="submit" className="h-12 w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          Enviar instruções
        </Button>
      </form>

      <Link
        to="/auth"
        className="type-secondary mt-6 block text-center underline-offset-4 hover:underline"
      >
        Voltar a entrar
      </Link>
    </AuthShell>
  );
}
