import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Landmark,
  Wallet,
  Map,
  Lock,
  Target,
  Repeat,
  PieChart,
  Sliders,
  Settings,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { useLedger } from "@/hooks/use-ledger";
import { usePrefs } from "@/hooks/use-prefs";

export const Route = createFileRoute("/app/plan")({
  head: () => ({
    meta: [
      { title: "Plano — Finance OS" },
      {
        name: "description",
        content: "Contas, carteiras, objetivos, pagamentos recorrentes e definições do teu sistema financeiro.",
      },
      { property: "og:title", content: "Plano — Finance OS" },
      { property: "og:description", content: "Contas, carteiras, objetivos e definições num só lugar." },
    ],
  }),
  component: PlanPage,
});

interface Entry {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

function PlanPage() {
  const { snapshot } = useLedger();
  const { term } = usePrefs();

  const money: Entry[] = [
    { to: "/app/accounts", label: "Contas", description: "Onde o dinheiro existe fisicamente.", icon: Landmark },
    { to: "/app/wallets", label: "Carteiras", description: "Para que serve cada parte do dinheiro.", icon: Wallet },
    { to: "/app/money-map", label: "Mapa do dinheiro", description: "As duas vistas do mesmo dinheiro.", icon: Map },
    { to: "/app/protected", label: term("protected"), description: "O que decidiste não usar no dia a dia.", icon: Lock },
  ];

  const planning: Entry[] = [
    { to: "/app/goals", label: "Objetivos", description: "Aquilo que estás a construir.", icon: Target },
    { to: "/app/recurring", label: "Recorrentes", description: "Próximos pagamentos e subscrições.", icon: Repeat },
    { to: "/app/reports", label: "Relatórios", description: "Padrões dos teus movimentos.", icon: PieChart },
  ];

  const system: Entry[] = [
    { to: "/app/agent", label: "Agente", description: "O teu assistente pessoal.", icon: MessageSquare },
    { to: "/app/personalization", label: "Personalização", description: "Tema, cor, painel e termos.", icon: Sliders },
    { to: "/app/settings", label: "Definições", description: "Perfil, privacidade e dados.", icon: Settings },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Plano" subtitle="Tudo o que organiza o teu dinheiro." />

      <div className="card-hero">
        <p className="type-section">{term("net_worth")}</p>
        <Money minor={snapshot.wealthMinor} className="type-display mt-2 block" />
        <p className="type-caption mt-2">
          <Money minor={snapshot.purposeTotalMinor} /> já tem um propósito.
        </p>
      </div>

      <Group title="Dinheiro" entries={money} />
      <Group title="Planeamento" entries={planning} />
      <Group title="Sistema" entries={system} />
    </div>
  );
}

function Group({ title, entries }: { title: string; entries: Entry[] }) {
  return (
    <section>
      <h2 className="type-section mb-3">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map((entry) => (
          <Link key={entry.to} to={entry.to} className="card-interactive flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-primary">
              <entry.icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-medium">{entry.label}</span>
              <span className="type-caption block">{entry.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
