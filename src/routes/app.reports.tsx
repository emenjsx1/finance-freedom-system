import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PieChart } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAnalyticsInput } from "@/hooks/use-analytics";
import { resolvePeriod, toISODate } from "@/lib/analytics/periods";
import { buildReport, hasEnoughData, netWorthChange, periodSummary } from "@/lib/analytics/service";
import { Symbol } from "@/lib/icons/symbols";

type ReportKind = "monthly" | "weekly" | "custom";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios — Norte" },
      { name: "description", content: "Resumo mensal, semanal e por período do teu dinheiro." },
      { property: "og:title", content: "Relatórios — Norte" },
      { property: "og:description", content: "Resumo mensal, semanal e por período do teu dinheiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const input = useAnalyticsInput();
  const [kind, setKind] = useState<ReportKind>("monthly");
  const today = toISODate(new Date());
  const [start, setStart] = useState(today.slice(0, 8) + "01");
  const [end, setEnd] = useState(today);

  const period = useMemo(() => {
    if (kind === "monthly") return resolvePeriod("this_month");
    if (kind === "custom") return resolvePeriod("custom", { start, end });
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return resolvePeriod("custom", { start: toISODate(from), end: today });
  }, [kind, start, end, today]);

  const enough = hasEnoughData(input);
  const report = useMemo(() => (enough ? buildReport(input, period) : null), [enough, input, period]);
  const summary = useMemo(() => (enough ? periodSummary(input, period) : null), [enough, input, period]);
  const worth = useMemo(() => (enough ? netWorthChange(input, period) : null), [enough, input, period]);

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" subtitle="Todos os números vêm da mesma análise." />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["monthly", "Mensal"],
            ["weekly", "Semanal"],
            ["custom", "Período"],
          ] as const
        ).map(([value, label]) => (
          <Button key={value} variant={kind === value ? "default" : "secondary"} size="xs" onClick={() => setKind(value)}>
            {label}
          </Button>
        ))}
      </div>

      {kind === "custom" ? (
        <div className="card-compact flex flex-wrap items-center gap-3">
          <label className="type-meta flex items-center gap-2">
            De
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-md bg-elevated px-2 py-1 text-sm"
            />
          </label>
          <label className="type-meta flex items-center gap-2">
            a
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-md bg-elevated px-2 py-1 text-sm"
            />
          </label>
        </div>
      ) : null}

      {!report || !summary || !worth ? (
        <EmptyState
          icon={PieChart}
          title="Ainda estamos a conhecer o teu dinheiro."
          description="Os relatórios aparecem depois dos primeiros movimentos registados."
        />
      ) : (
        <>
          <section className="card-standard space-y-2">
            <h2 className="type-section">{period.label}{period.partial ? " (em curso)" : ""}</h2>
            <Row label="Entradas" minor={summary.incomeMinor} />
            <Row label="Gastos" minor={summary.expensesMinor} />
            <Row label="Construído" minor={summary.builtMinor} />
            <Row label="Objetivos" minor={summary.goalsMinor} />
            <Row label="Resultado" minor={summary.netMinor} />
          </section>

          {kind !== "weekly" ? (
            <>
              <section className="card-standard">
                <h2 className="type-section mb-3">Principais categorias</h2>
                {report.categorias.length === 0 ? (
                  <p className="type-caption">Sem gastos neste período.</p>
                ) : (
                  <ul className="space-y-2">
                    {report.categorias.slice(0, 5).map((category) => (
                      <li key={category.categoryId} className="flex items-center justify-between">
                        <span className="text-sm">
                          <span className="inline-flex items-center gap-1.5"><Symbol name={category.icon} className="size-4 text-muted-foreground" /> {category.name}</span>
                        </span>
                        <Money minor={category.amountMinor} className="tabular-nums text-sm" />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card-standard space-y-2">
                <h2 className="type-section">Património</h2>
                <Row label="No início" minor={worth.startMinor} />
                <Row label="Agora" minor={worth.endMinor} />
                <Row label="Variação" minor={worth.changeMinor} />
              </section>
            </>
          ) : null}

          <section className="card-standard">
            <h2 className="type-section mb-3">A seguir</h2>
            {report.recorrentes.items.length === 0 ? (
              <p className="type-caption">Sem compromissos configurados.</p>
            ) : (
              <ul className="space-y-2">
                {report.recorrentes.items.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center justify-between">
                    <span className="text-sm">{item.name}</span>
                    <Money minor={item.monthlyMinor} className="tabular-nums text-sm" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="type-meta">
            Relatório de {report.periodo}. Transferências e redistribuições não contam como entradas nem gastos.
          </p>
        </>
      )}
    </div>
  );
}

function Row({ label, minor }: { label: string; minor: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="type-caption">{label}</span>
      <Money minor={minor} className="tabular-nums text-sm" />
    </div>
  );
}
