import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAnalyticsInput } from "@/hooks/use-analytics";
import { PERIOD_OPTIONS, resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { categoryDetail } from "@/lib/analytics/service";
import { formatPercent } from "@/lib/finance/currency";
import { Symbol } from "@/lib/icons/symbols";

export const Route = createFileRoute("/app/analytics/category/$categoryId")({
  head: () => ({
    meta: [
      { title: "Categoria — Análise" },
      { name: "description", content: "Detalhe factual dos gastos de uma categoria." },
      { property: "og:title", content: "Categoria — Análise" },
      { property: "og:description", content: "Detalhe factual dos gastos de uma categoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoryDetailPage,
});

function CategoryDetailPage() {
  const { categoryId } = Route.useParams();
  const input = useAnalyticsInput();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const period = useMemo(() => resolvePeriod(periodKey), [periodKey]);
  const detail = useMemo(() => categoryDetail(input, period, categoryId), [input, period, categoryId]);

  return (
    <div className="space-y-6">
      <PageHeader title={detail.name} subtitle={period.label} />

      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.filter((option) => option.key !== "custom").map((option) => (
          <Button
            key={option.key}
            variant={periodKey === option.key ? "default" : "secondary"}
            size="xs"
            onClick={() => setPeriodKey(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <section className="card-standard space-y-2">
        <Row label="Neste período" minor={detail.amountMinor} />
        <Row label="Período anterior" minor={detail.previousMinor} />
        <Row label="Diferença" minor={detail.differenceMinor} />
        <p className="type-caption">
          {detail.changeRate === null
            ? "Sem valor no período anterior para comparar."
            : `Variação: ${formatPercent(detail.changeRate * 100)}.`}
        </p>
      </section>

      <section className="card-standard space-y-2">
        <Row label="Transações" minor={null} value={String(detail.count)} />
        <Row label="Média" minor={detail.averageMinor} />
        <Row label="Maior" minor={detail.largest?.amountMinor ?? 0} />
      </section>

      <section className="card-standard">
        <h2 className="type-section mb-3">Movimentos recentes</h2>
        {detail.transactions.length === 0 ? (
          <p className="type-caption">Sem movimentos nesta categoria neste período.</p>
        ) : (
          <ul className="space-y-2">
            {detail.transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between">
                <span className="text-sm">{tx.description || tx.merchant || detail.name}</span>
                <Money minor={tx.amountMinor} className="tabular-nums text-sm" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button asChild variant="ghost" size="sm">
        <Link to="/app/analytics">Voltar à análise</Link>
      </Button>
    </div>
  );
}

function Row({ label, minor, value }: { label: string; minor: number | null; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="type-caption">{label}</span>
      {minor === null ? (
        <span className="tabular-nums text-sm">{value}</span>
      ) : (
        <Money minor={minor} className="tabular-nums text-sm" />
      )}
    </div>
  );
}
