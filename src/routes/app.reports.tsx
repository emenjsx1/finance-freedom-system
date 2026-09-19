import { createFileRoute } from "@tanstack/react-router";
import { PieChart } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios — Finance OS" },
      { name: "description", content: "Vê para onde vai o teu dinheiro mês após mês." },
      { property: "og:title", content: "Relatórios — Finance OS" },
      { property: "og:description", content: "Vê para onde vai o teu dinheiro mês após mês." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Padrões de entradas, gastos e construção." />
      <EmptyState
        icon={PieChart}
        title="Sem dados suficientes"
        description="Os relatórios aparecem depois do primeiro mês de movimentos registados."
      />
    </div>
  );
}
