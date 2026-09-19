import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, FileText, LifeBuoy, ScrollText, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { APP_VERSION } from "@/lib/app-info";

const LINKS: { icon: typeof BookOpen; label: string; hint: string; href: string }[] = [
  { icon: LifeBuoy, label: "Centro de ajuda", hint: "Perguntas frequentes e contactos", href: "/support" },
  { icon: ScrollText, label: "Política de Privacidade", hint: "O que recolhemos e porquê", href: "/privacy" },
  { icon: FileText, label: "Termos de Utilização", hint: "As condições do serviço", href: "/terms" },
  { icon: Sparkles, label: "IA e os teus dados", hint: "O que o Agente vê e memoriza", href: "/ai-data" },
];

export const Route = createFileRoute("/app/help")({
  head: () => ({
    meta: [
      { title: "Ajuda e legal — Norte" },
      { name: "description", content: "Ajuda, privacidade, termos e informação sobre a aplicação." },
      { property: "og:title", content: "Ajuda e legal — Norte" },
      { property: "og:description", content: "Apoio e documentos legais da Norte" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div>
      <PageHeader title="Ajuda e legal" subtitle="Apoio, privacidade e condições, sempre acessíveis." />

      <div className="list-group">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} className="list-row" target="_blank" rel="noreferrer">
            <span className="icon-tile" aria-hidden>
              <link.icon className="size-4 text-muted-foreground" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-medium">{link.label}</span>
              <span className="type-meta block truncate">{link.hint}</span>
            </span>
          </a>
        ))}
      </div>

      <p className="type-meta mt-6">
        Norte versão {APP_VERSION}. Feito com cuidado em Moçambique.
      </p>
    </div>
  );
}
