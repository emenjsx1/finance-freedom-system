import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getSignedInDestination } from "@/lib/auth/destination";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finance OS — Organiza o teu dinheiro" },
      {
        name: "description",
        content:
          "Sistema pessoal de finanças: separa onde o dinheiro está de para que serve, e constrói a tua liberdade.",
      },
      { property: "og:title", content: "Finance OS — Organiza o teu dinheiro" },
      {
        property: "og:description",
        content: "Separa onde o dinheiro está de para que serve, e constrói a tua liberdade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading || !session) return;
    setRedirecting(true);
    void getSignedInDestination().then((to) => navigate({ to, replace: true }));
  }, [loading, navigate, session]);

  if (loading || redirecting) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-6">
        <div className="size-8 animate-pulse rounded-full bg-primary" aria-label="A abrir a tua conta" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2rem)]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Wallet className="size-6" />
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Organiza o teu dinheiro.
          <br />
          <span className="text-primary">Constrói a tua liberdade.</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          O saldo da tua conta não é necessariamente o dinheiro que tens disponível para gastar.
          O Finance OS separa onde o dinheiro está de para que serve.
        </p>

        <div className="mt-10 space-y-3">
          <Link
            to="/signup"
            className="flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Criar conta
          </Link>
          <Link
            to="/auth"
            className="flex w-full items-center justify-center rounded-2xl border border-border/70 px-5 py-3.5 text-sm font-semibold"
          >
            Já tenho conta
          </Link>
        </div>

        <ul className="mt-10 space-y-3 text-sm text-muted-foreground">
          <li className="flex items-center gap-3">
            <Sparkles className="size-4 text-primary" /> Distribuição automática de cada entrada
          </li>
          <li className="flex items-center gap-3">
            <ShieldCheck className="size-4 text-primary" /> Os teus dados são só teus
          </li>
        </ul>
      </div>
    </div>
  );
}
