import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, Info } from "lucide-react";

import { CategoryBreakdown, ComparisonBars, NetWorthChart, TrendLine } from "@/components/charts";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAnalyticsInput } from "@/hooks/use-analytics";
import { usePrefs } from "@/hooks/use-prefs";
import { useSetup } from "@/hooks/use-setup";
import { buildInsights } from "@/lib/analytics/insights";
import {
  PERIOD_OPTIONS,
  formatDay,
  resolvePeriod,
  toISODate,
  type PeriodKey,
} from "@/lib/analytics/periods";
import {
  METRIC_DEFINITIONS,
  comparePeriods,
  goalAnalytics,
  hasEnoughData,
  incomeAnalysis,
  largestExpenses,
  merchantAnalytics,
  moneyFlow,
  netWorthChange,
  netWorthHistory,
  periodSummary,
  protectedAnalytics,
  recurringAnalysis,
  spendingByCategory,
  spendingTrend,
  walletAnalytics,
  wealthBuilding,
  weekdayPattern,
} from "@/lib/analytics/service";
import { formatPercent } from "@/lib/finance/currency";
import type { AnalyticsModuleId } from "@/lib/prefs/types";
import { Symbol } from "@/lib/icons/symbols";

export const Route = createFileRoute("/app/analytics/")({
  head: () => ({
    meta: [
      { title: "Análise — Finance OS" },
      { name: "description", content: "O que aconteceu com o teu dinheiro: entradas, gastos, construção e padrões." },
      { property: "og:title", content: "Análise — Finance OS" },
      { property: "og:description", content: "Entradas, gastos, construção e padrões do teu dinheiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const input = useAnalyticsInput();
  const { prefs } = usePrefs();
  const { setup } = useSetup();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const today = toISODate(new Date());
  const [customStart, setCustomStart] = useState(today.slice(0, 8) + "01");
  const [customEnd, setCustomEnd] = useState(today);
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const [equivalent, setEquivalent] = useState(true);

  const period = useMemo(
    () => resolvePeriod(periodKey, { start: customStart, end: customEnd }),
    [periodKey, customStart, customEnd],
  );

  const enabled = (id: AnalyticsModuleId) => prefs.analyticsModules.includes(id);

  const data = useMemo(() => {
    if (!hasEnoughData(input)) return null;
    return {
      summary: periodSummary(input, period),
      flow: moneyFlow(input, period),
      categories: spendingByCategory(input, period),
      trend: spendingTrend(input, period, granularity),
      comparison: comparePeriods(input, period, equivalent ? "equivalent" : "full"),
      income: incomeAnalysis(input, period),
      wealth: wealthBuilding(input, period),
      worthHistory: netWorthHistory(input, 6),
      worthChange: netWorthChange(input, period),
      wallets: walletAnalytics(input, period),
      prot: protectedAnalytics(input, period),
      goals: goalAnalytics(input, period),
      recurring: recurringAnalysis(input),
      largest: largestExpenses(input, period),
      merchants: merchantAnalytics(input, period),
      weekday: weekdayPattern(input),
      insights: buildInsights(input, period, 3),
    };
  }, [input, period, granularity, equivalent]);

  return (
    <div className="space-y-8">
      <PageHeader title="Análise" subtitle="O que aconteceu com o teu dinheiro." />

      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
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

      {periodKey === "custom" ? (
        <div className="card-compact flex flex-wrap items-center gap-3">
          <label className="type-meta flex items-center gap-2">
            De
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-md bg-elevated px-2 py-1 text-sm"
            />
          </label>
          <label className="type-meta flex items-center gap-2">
            a
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-md bg-elevated px-2 py-1 text-sm"
            />
          </label>
        </div>
      ) : null}

      {period.partial ? (
        <p className="type-caption">Até {formatDay(new Date(Date.now()))} — o período ainda não terminou.</p>
      ) : null}

      {!data ? (
        <EmptyState
          icon={BarChart3}
          title="Ainda estamos a conhecer o teu dinheiro."
          description="Continua a registar os teus movimentos. As análises aparecem aqui."
        />
      ) : (
        <>
          {data.summary.unconvertedCurrencies.length > 0 ? (
            <p className="type-caption">
              Valores em {data.summary.unconvertedCurrencies.join(", ")} ficam de fora: ainda não existe uma taxa de
              câmbio definida por ti.
            </p>
          ) : null}

          <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Metric metric="income" minor={data.summary.incomeMinor} />
            <Metric metric="expenses" minor={data.summary.expensesMinor} />
            <Metric metric="built" minor={data.summary.builtMinor} />
            <Metric metric="net" minor={data.summary.netMinor} signed />
          </section>

          {data.summary.adjustmentsMinor !== 0 ? (
            <p className="type-caption">
              Ajustes de saldo registados separadamente: <Money minor={data.summary.adjustmentsMinor} />.
            </p>
          ) : null}
          {data.summary.transferCount > 0 || data.summary.reallocationCount > 0 ? (
            <p className="type-caption">
              Movimentos internos: {data.summary.transferCount} transferência(s) e {data.summary.reallocationCount}{" "}
              redistribuição(ões). Não entram em entradas nem em gastos.
            </p>
          ) : null}

          {data.insights.length > 0 ? (
            <Section title="A ter em atenção">
              <ul className="space-y-3">
                {data.insights.map((insight) => (
                  <li key={insight.id}>
                    <p className="type-body">{insight.title}</p>
                    {insight.detail ? <p className="type-caption mt-0.5">{insight.detail}</p> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {enabled("flow") ? (
            <Section title="Fluxo do dinheiro">
              <FlowRow label="Recebido" minor={data.flow.receivedMinor} />
              <FlowRow label="Gasto" minor={data.flow.spentMinor} />
              <FlowRow label="Construção" minor={data.flow.builtMinor} />
              <FlowRow label="dos quais para objetivos" minor={data.flow.goalsMinor} />
              <FlowRow label="Protegido" minor={data.flow.protectedMinor} />
              <FlowRow label="Resta em carteiras de uso" minor={data.flow.remainingSpendableMinor} />
            </Section>
          ) : null}

          {enabled("spending") ? (
            <Section title="Gastos por categoria">
              {data.categories.length === 0 ? (
                <p className="type-caption">Ainda não existem gastos neste período.</p>
              ) : (
                <div className="space-y-4">
                  <CategoryBreakdown
                    rows={data.categories.map((c) => ({
                      id: c.categoryId,
                      name: c.name,
                      icon: c.icon,
                      amountMinor: c.amountMinor,
                      share: c.share,
                    }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    {data.categories.slice(0, 6).map((c) => (
                      <Button key={c.categoryId} asChild variant="ghost" size="xs">
                        <Link to="/app/analytics/category/$categoryId" params={{ categoryId: c.categoryId }}>
                          <span className="inline-flex items-center gap-1.5"><Symbol name={c.icon} className="size-3.5" /> {c.name}</span>
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          ) : null}

          {enabled("trend") ? (
            <Section title="Tendência">
              <div className="mb-3 flex gap-2">
                {(["daily", "weekly", "monthly"] as const).map((g) => (
                  <Button
                    key={g}
                    variant={granularity === g ? "default" : "secondary"}
                    size="xs"
                    onClick={() => setGranularity(g)}
                  >
                    {g === "daily" ? "Diário" : g === "weekly" ? "Semanal" : "Mensal"}
                  </Button>
                ))}
              </div>
              {data.trend.length < 2 ? (
                <p className="type-caption">Ainda não existem dados suficientes para esta análise.</p>
              ) : (
                <TrendLine
                  ariaLabel="Gastos ao longo do período"
                  points={data.trend.map((p) => ({ label: p.label, value: p.expensesMinor }))}
                />
              )}
            </Section>
          ) : null}

          {enabled("comparison") ? (
            <Section title="Comparação">
              <ComparisonBars
                current={data.comparison.current.expensesMinor}
                previous={data.comparison.previous.expensesMinor}
                currentLabel={data.comparison.currentLabel}
                previousLabel={data.comparison.previousLabel}
              />
              {data.comparison.partialNote ? (
                <p className="type-caption mt-3">{data.comparison.partialNote}</p>
              ) : null}
              {period.partial ? (
                <Button variant="ghost" size="xs" className="mt-2" onClick={() => setEquivalent((v) => !v)}>
                  {equivalent ? "Comparar com o mês completo" : "Comparar o mesmo período"}
                </Button>
              ) : null}
            </Section>
          ) : null}

          {enabled("income") ? (
            <Section title="Entradas">
              <p className="type-caption">
                {data.income.count} entrada(s) · <Money minor={data.income.totalMinor} />
              </p>
              <ul className="mt-3 space-y-2">
                {data.income.sources.map((source) => (
                  <li key={source.name} className="flex items-center justify-between">
                    <span className="text-sm">
                      <span className="inline-flex items-center gap-1.5"><Symbol name={source.icon} className="size-4 text-muted-foreground" /> {source.name}</span>
                    </span>
                    <Money minor={source.amountMinor} className="tabular-nums text-sm" />
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1">
                {data.income.history.map((h) => (
                  <div key={h.label} className="flex items-center justify-between">
                    <span className="type-caption">
                      {h.label}
                      {h.partial ? " (até agora)" : ""}
                    </span>
                    <Money minor={h.amountMinor} className="tabular-nums text-sm" />
                  </div>
                ))}
              </div>
              {data.income.historicalAverageMinor !== null ? (
                <p className="type-caption mt-3">
                  Média histórica: <Money minor={data.income.historicalAverageMinor} />
                </p>
              ) : (
                <p className="type-caption mt-3">Ainda não existem meses completos suficientes para uma média histórica.</p>
              )}
            </Section>
          ) : null}

          {enabled("wealth") ? (
            <Section title="Construção">
              <Money minor={data.wealth.totalMinor} className="type-display block" />
              <p className="type-caption mt-2">
                {data.wealth.buildRate === null
                  ? "Sem entradas neste período."
                  : `Taxa de construção: ${formatPercent(data.wealth.buildRate * 100)} das entradas.`}
                {data.summary.spendRate !== null
                  ? ` · Percentagem utilizada: ${formatPercent(data.summary.spendRate * 100)}.`
                  : ""}
              </p>
              <ul className="mt-3 space-y-2">
                {data.wealth.wallets.map((wallet) => (
                  <li key={wallet.id} className="flex items-center justify-between">
                    <span className="text-sm">
                      <span className="inline-flex items-center gap-1.5"><Symbol name={wallet.icon} className="size-4 text-muted-foreground" /> {wallet.name}</span>
                    </span>
                    <Money minor={wallet.amountMinor} className="tabular-nums text-sm" />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {enabled("net_worth") ? (
            <Section title="Evolução do património">
              <NetWorthChart points={data.worthHistory.map((p) => ({ label: p.label, value: p.netWorthMinor }))} />
              <div className="mt-4 space-y-1">
                <Row label="Início do período" minor={data.worthChange.startMinor} />
                <Row label="Agora" minor={data.worthChange.endMinor} />
                <Row label="Variação" minor={data.worthChange.changeMinor} />
                <Row label="Entradas" minor={data.worthChange.incomeMinor} />
                <Row label="Gastos" minor={-data.worthChange.expensesMinor} />
                {data.worthChange.adjustmentsMinor !== 0 ? (
                  <Row label="Ajustes" minor={data.worthChange.adjustmentsMinor} />
                ) : null}
              </div>
            </Section>
          ) : null}

          {enabled("wallets") ? (
            <Section title="Carteiras">
              <ul className="space-y-3">
                {data.wallets.map((wallet) => (
                  <li key={wallet.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        <span className="inline-flex items-center gap-1.5"><Symbol name={wallet.icon} className="size-4 text-muted-foreground" /> {wallet.name}</span>
                      </span>
                      <Money minor={wallet.balanceMinor} className="tabular-nums text-sm" />
                    </div>
                    <p className="type-meta mt-0.5">
                      Entrou <Money minor={wallet.addedMinor} /> · Usado <Money minor={wallet.usedMinor} />
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {enabled("protected") ? (
            <Section title="Dinheiro protegido">
              <Row label="No início" minor={data.prot.startMinor} />
              <Row label="Adicionado" minor={data.prot.addedMinor} />
              <Row label="Retirado" minor={data.prot.withdrawnMinor} />
              <Row label="Agora" minor={data.prot.endMinor} />
              {data.prot.reasons.length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="type-section">Motivos das retiradas</p>
                  {data.prot.reasons.map((reason) => (
                    <Row key={reason.reason} label={`${reason.reason} (${reason.count})`} minor={reason.amountMinor} />
                  ))}
                </div>
              ) : null}
            </Section>
          ) : null}

          {enabled("goals") ? (
            <Section title="Objetivos">
              <Row label="Colocado neste período" minor={data.goals.contributedMinor} />
              <Row label="Total atribuído" minor={data.goals.totalAssignedMinor} />
              <ul className="mt-3 space-y-2">
                {data.goals.goals.map((goal) => (
                  <li key={goal.id} className="flex items-center justify-between">
                    <span className="text-sm">
                      <span className="inline-flex items-center gap-1.5"><Symbol name={goal.icon} className="size-4 text-muted-foreground" /> {goal.name}</span>
                    </span>
                    <Money minor={goal.contributedMinor} className="tabular-nums text-sm" />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {enabled("recurring") ? (
            <Section title="Despesas recorrentes">
              {data.recurring.items.length === 0 ? (
                <p className="type-caption">Ainda não configuraste despesas recorrentes.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {data.recurring.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between">
                        <span className="text-sm">{item.name}</span>
                        <span className="type-body tabular-nums">
                          <Money minor={item.monthlyMinor} />
                          <span className="type-meta ml-1">/mês</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="type-caption mt-3">
                    Compromissos mensais: <Money minor={data.recurring.totalMonthlyMinor} />
                  </p>
                </>
              )}
            </Section>
          ) : null}

          {enabled("largest") ? (
            <Section title="Maiores despesas">
              {data.largest.length === 0 ? (
                <p className="type-caption">Sem despesas neste período.</p>
              ) : (
                <ul className="space-y-2">
                  {data.largest.map((tx) => (
                    <li key={tx.id} className="flex items-center justify-between">
                      <span className="text-sm">{tx.description || tx.merchant || "Despesa"}</span>
                      <Money minor={tx.amountMinor} className="tabular-nums text-sm" />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ) : null}

          {enabled("patterns") ? (
            <Section title="Padrões">
              <p className="type-body">
                {data.summary.expenseCount} despesa(s) neste período · média <Money minor={data.summary.averageExpenseMinor} />
              </p>
              <p className="type-caption mt-2">
                {data.weekday.sufficient && data.weekday.topDay
                  ? `Historicamente, ${data.weekday.topDay.toLowerCase()} é o dia com mais gastos (últimas ${data.weekday.weeks} semanas).`
                  : "Ainda não existem dados suficientes para esta análise."}
              </p>
              {data.merchants.length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="type-section">Mais frequentes</p>
                  {data.merchants.map((m) => (
                    <div key={m.name} className="flex items-center justify-between">
                      <span className="type-caption">
                        {m.name} · {m.count}x
                      </span>
                      <Money minor={m.amountMinor} className="tabular-nums text-sm" />
                    </div>
                  ))}
                </div>
              ) : null}
            </Section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/app/reports">Relatórios</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/app/agent">Pergunta ao teu dinheiro</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/personalization">Escolher módulos</Link>
            </Button>
          </div>
          <p className="type-meta">Moeda base: {setup.currencyCode}.</p>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-standard">
      <h2 className="type-section mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ metric, minor, signed }: { metric: keyof typeof METRIC_DEFINITIONS; minor: number; signed?: boolean }) {
  const [open, setOpen] = useState(false);
  const definition = METRIC_DEFINITIONS[metric]!;
  return (
    <div className="card-compact">
      <button type="button" className="type-meta flex items-center gap-1" onClick={() => setOpen((v) => !v)}>
        {definition.label.toUpperCase()}
        <Info className="size-3" aria-hidden />
        <span className="sr-only">O que significa {definition.label}?</span>
      </button>
      <span className="mt-1.5 block text-lg font-semibold tabular-nums">
        {signed && minor > 0 ? "+" : ""}
        <Money minor={minor} />
      </span>
      {open ? <p className="type-meta mt-2">{definition.explanation}</p> : null}
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

function FlowRow({ label, minor }: { label: string; minor: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border/70/40 py-2 last:border-0">
      <span className="text-sm">{label}</span>
      <Money minor={minor} className="tabular-nums text-sm" />
    </div>
  );
}
