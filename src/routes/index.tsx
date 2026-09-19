import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Wallet } from "lucide-react";

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
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10">
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
            to="/onboarding"
            className="flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Começar
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
