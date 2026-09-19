import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getSignedInDestination } from "@/lib/auth/destination";
import { authErrorMessage } from "@/lib/auth/errors";
import { notifyError } from "@/lib/ui/feedback";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova palavra-passe — Norte" },
      { name: "description", content: "Define uma nova palavra-passe para a tua conta Norte." },
      { property: "og:title", content: "Nova palavra-passe — Norte" },
      { property: "og:description", content: "Define uma nova palavra-passe em segurança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        setReady(data.session ? "ok" : "expired");
      });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      notifyError("As palavras-passe não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("A palavra-passe foi atualizada.");
      const to = await getSignedInDestination();
      setTimeout(() => void navigate({ to, replace: true }), 1200);
    } catch (error) {
      notifyError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center overflow-y-auto bg-background px-5 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2rem)] sm:px-6">
      <div className="mx-auto w-full max-w-sm">
        <span
          aria-hidden
          className="mb-8 grid size-10 place-items-center rounded-[var(--r-md)] bg-accent text-accent-foreground"
        >
          ◈
        </span>

        {ready === "checking" ? (
          <p className="type-secondary">A validar o link…</p>
        ) : ready === "expired" ? (
          <>
            <h1 className="type-title">Este link expirou.</h1>
            <p className="type-secondary mt-3">Pede um novo link para redefinires a palavra-passe.</p>
            <Button asChild className="mt-8 h-12 w-full">
              <Link to="/auth">Pedir novo link</Link>
            </Button>
          </>
        ) : done ? (
          <>
            <h1 className="type-title">A palavra-passe foi atualizada.</h1>
            <p className="type-secondary mt-3">Já podes continuar a usar a aplicação.</p>
          </>
        ) : (
          <>
            <h1 className="type-title">Nova palavra-passe</h1>
            <p className="type-secondary mt-3">Mínimo de 8 caracteres. Usa algo que só tu saibas.</p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label className="type-meta">Nova palavra-passe</Label>
                <div className="relative">
                  <Input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              </div>
              <div className="space-y-2">
                <Label className="type-meta">Confirmar palavra-passe</Label>
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
          </>
        )}
      </div>
    </div>
  );
}
