import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/transactions")({
  head: () => ({
    meta: [
      { title: "Transações — Finance OS" },
      { name: "description", content: "Todas as entradas e gastos do teu sistema financeiro." },
      { property: "og:title", content: "Transações — Finance OS" },
      { property: "og:description", content: "Todas as entradas e gastos do teu sistema financeiro." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <div>
      <PageHeader title="Transações" subtitle="Cada entrada é distribuída pela tua regra." />
      <EmptyState
        icon={Receipt}
        title="Nenhuma transação"
        description="O registo de movimentos fica disponível assim que a tua conta estiver ligada."
      />
    </div>
  );
}
