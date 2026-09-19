import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/goals")({
  head: () => ({
    meta: [
      { title: "Objetivos — Finance OS" },
      { name: "description", content: "Define objetivos e acompanha quanto já construíste para cada um." },
      { property: "og:title", content: "Objetivos — Finance OS" },
      { property: "og:description", content: "Define objetivos e acompanha o teu progresso." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  return (
    <div>
      <PageHeader title="Objetivos" subtitle="Aquilo que estás a construir, com data e valor." />
      <EmptyState
        icon={Target}
        title="Ainda sem objetivos"
        description="Cria o teu primeiro objetivo para dar destino ao pote de objetivos."
      />
    </div>
  );
}
