import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Finance OS" },
      { name: "description", content: "Entra na tua conta Finance OS ou cria uma nova em segundos." },
      { property: "og:title", content: "Entrar — Finance OS" },
      { property: "og:description", content: "Entra na tua conta Finance OS ou cria uma nova." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    toast.info("A ligação de contas ainda não está ativa neste projeto.");
  }

  const titles: Record<Mode, string> = {
    signin: "Bem-vindo de volta",
    signup: "Criar a tua conta",
    forgot: "Recuperar palavra-passe",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{titles[mode]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "forgot"
            ? "Enviamos-te um link para definires uma nova palavra-passe."
            : "O teu sistema financeiro, protegido."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === "signup" ? (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="O teu nome" />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@exemplo.com"
              required
            />
          </div>

          {mode !== "forgot" ? (
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          ) : null}

          <Button type="submit" className="w-full">
            {mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              <button className="underline" onClick={() => setMode("forgot")}>
                Esqueci a palavra-passe
              </button>
              <p>
                Ainda não tens conta?{" "}
                <button className="text-primary underline" onClick={() => setMode("signup")}>
                  Criar conta
                </button>
              </p>
            </>
          ) : (
            <button className="text-primary underline" onClick={() => setMode("signin")}>
              Voltar a entrar
            </button>
          )}
          <p className="pt-4 text-xs">
            <Link to="/" className="underline">
              Voltar ao início
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
