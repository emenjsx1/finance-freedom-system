import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import logoUrl from "@/assets/finan-logo.png";

/** Shared shell for the public legal and support pages. No sign-in required. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-[max(env(safe-area-inset-top),2rem)]">
      <Link to="/" className="inline-block">
        <img src={logoUrl} alt="Norte" className="h-7 w-auto" />
      </Link>

      <h1 className="type-display mt-8">{title}</h1>
      <p className="type-meta mt-2">Atualizado em {updated}</p>

      <div className="mt-8 space-y-6">{children}</div>

      <nav className="mt-12 flex flex-wrap gap-4 border-t border-border/70 pt-6 text-sm">
        <Link to="/privacy" className="text-primary underline">
          Privacidade
        </Link>
        <Link to="/terms" className="text-primary underline">
          Termos
        </Link>
        <Link to="/ai-data" className="text-primary underline">
          IA e os teus dados
        </Link>
        <Link to="/support" className="text-primary underline">
          Apoio
        </Link>
      </nav>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="type-heading">{title}</h2>
      <div className="mt-2 space-y-3 text-[0.9375rem] leading-relaxed text-secondary-foreground">
        {children}
      </div>
    </section>
  );
}

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-accent px-1 text-foreground">[a definir: {children}]</mark>
  );
}
