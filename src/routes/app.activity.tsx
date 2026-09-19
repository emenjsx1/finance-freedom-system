import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Receipt, Search, SlidersHorizontal, SearchX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { useTransactionLauncher } from "@/components/transactions/transaction-launcher";
import {
  EMPTY_FILTERS,
  FilterSheet,
  activeFilterCount,
  type TxFilters,
} from "@/components/transactions/filter-sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { findCategory } from "@/lib/finance/categories";
import { formatMoney } from "@/lib/finance/currency";
import { monthTotals } from "@/lib/finance/engine";
import type { Transaction, TxKind } from "@/lib/finance/ledger-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/activity")({
  head: () => ({
    meta: [
      { title: "Atividade — Finance OS" },
      { name: "description", content: "Todo o teu histórico financeiro: entradas, despesas, transferências e ajustes." },
      { property: "og:title", content: "Atividade — Finance OS" },
      { property: "og:description", content: "Pesquisa, filtra e revê todos os teus movimentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

const PAGE_SIZE = 40;

const QUICK_FILTERS: { id: string; label: string; kinds: TxKind[] }[] = [
  { id: "all", label: "Todos", kinds: [] },
  { id: "income", label: "Entradas", kinds: ["income"] },
  { id: "expense", label: "Despesas", kinds: ["expense"] },
  { id: "transfer", label: "Transferências", kinds: ["transfer"] },
  { id: "reallocation", label: "Guardado", kinds: ["reallocation"] },
  { id: "adjustment", label: "Ajustes", kinds: ["adjustment"] },
];

function ActivityPage() {
  const { setup } = useSetup();
  const { ledger, hydrated } = useLedger();
  const { openQuickActions } = useTransactionLauncher();
  const isMobile = useIsMobile();

  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState("all");
  const [filters, setFilters] = useState<TxFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [cursor, setCursor] = useState(new Date());
  const [cursorTouched, setCursorTouched] = useState(false);

  // Open on the latest month that actually has movements, never an empty month.
  useEffect(() => {
    if (cursorTouched || !hydrated || ledger.transactions.length === 0) return;
    const latest = ledger.transactions.reduce(
      (max, tx) => (tx.occurredAt > max ? tx.occurredAt : max),
      ledger.transactions[0]!.occurredAt,
    );
    const date = new Date(latest);
    setCursor((current) =>
      current.getFullYear() === date.getFullYear() && current.getMonth() === date.getMonth()
        ? current
        : new Date(date.getFullYear(), date.getMonth(), 1),
    );
  }, [cursorTouched, hydrated, ledger.transactions]);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    const id = setTimeout(() => setQuery(rawQuery), 200);
    return () => clearTimeout(id);
  }, [rawQuery]);

  const currency = setup.currencyCode;
  const allTags = useMemo(
    () => [...new Set(ledger.transactions.flatMap((tx) => tx.tags))].sort(),
    [ledger.transactions],
  );

  const quickKinds = QUICK_FILTERS.find((f) => f.id === quick)?.kinds ?? [];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const usingCustomRange = Boolean(filters.from || filters.to);

    return ledger.transactions
      .filter((tx) => {
        const date = new Date(tx.occurredAt);
        if (!usingCustomRange) {
          if (date.getFullYear() !== cursor.getFullYear() || date.getMonth() !== cursor.getMonth()) return false;
        }
        if (quickKinds.length && !quickKinds.includes(tx.kind)) return false;
        if (filters.kinds.length && !filters.kinds.includes(tx.kind)) return false;
        if (filters.categoryIds.length && !(tx.categoryId && filters.categoryIds.includes(tx.categoryId)))
          return false;
        if (filters.accountIds.length) {
          const ids = [tx.accountId, tx.fromAccountId, tx.toAccountId].filter(Boolean) as string[];
          if (!ids.some((id) => filters.accountIds.includes(id))) return false;
        }
        if (filters.bucketIds.length) {
          const ids = [
            tx.bucketId,
            tx.fromBucketId,
            tx.toBucketId,
            ...(tx.allocations ?? []).map((a) => a.bucketId),
          ].filter(Boolean) as string[];
          if (!ids.some((id) => filters.bucketIds.includes(id))) return false;
        }
        if (filters.from && tx.occurredAt.slice(0, 10) < filters.from) return false;
        if (filters.to && tx.occurredAt.slice(0, 10) > filters.to) return false;
        if (filters.minMinor && tx.amountMinor < filters.minMinor) return false;
        if (filters.maxMinor && tx.amountMinor > filters.maxMinor) return false;
        if (filters.tags.length && !tx.tags.some((tag) => filters.tags.includes(tag))) return false;

        if (q) {
          const category = findCategory(ledger.categories, tx.categoryId)?.name ?? "";
          const account = setup.accounts.find((a) => a.id === tx.accountId)?.name ?? "";
          const wallet = setup.ruleItems.find((r) => r.id === tx.bucketId)?.name ?? "";
          const haystack = [tx.merchant, tx.description, tx.note, category, account, wallet, ...tx.tags]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [ledger.transactions, ledger.categories, setup.accounts, setup.ruleItems, filters, query, cursor, quickKinds]);

  const page = results.slice(0, visible);
  const groups = useMemo(() => groupByDay(page), [page]);
  const totals = monthTotals(ledger.transactions, cursor.getFullYear(), cursor.getMonth(), setup.ruleItems);
  const filterCount = activeFilterCount(filters);

  const monthLabel = cursor.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  const canGoForward = cursor < new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return (
    <div className="space-y-6 pb-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="type-title">Atividade</h1>
          <p className="type-secondary mt-2">Todo o teu histórico, num só lugar.</p>
        </div>
        <Button size="icon-sm" aria-label="Adicionar movimento" onClick={openQuickActions}>
          <Plus />
        </Button>
      </header>

      {/* Compact period summary: month navigation plus the two numbers that matter. */}
      <section className="card-standard">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => { setCursorTouched(true); setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)); }}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="type-section uppercase">{monthLabel}</p>
          <button
            type="button"
            aria-label="Mês seguinte"
            disabled={!canGoForward}
            onClick={() => { setCursorTouched(true); setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)); }}
            className="rounded-full p-2 text-muted-foreground disabled:opacity-30 hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="type-meta">Entradas</p>
            <p className="numeric mt-1 text-xl font-semibold text-income">
              {formatMoney(totals.income, currency, { withSymbol: false, compactDecimals: true })}
            </p>
          </div>
          <div>
            <p className="type-meta">Saídas</p>
            <p className="numeric mt-1 text-xl font-semibold text-expense">
              {formatMoney(totals.expenses, currency, { withSymbol: false, compactDecimals: true })}
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="Pesquisar movimentos"
              aria-label="Pesquisar movimentos"
            />
          </div>
          <Button
            variant="secondary"
            aria-label="Filtros avançados"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            {filterCount ? filterCount : null}
          </Button>
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setQuick(filter.id)}
              aria-pressed={quick === filter.id}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors",
                quick === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {!hydrated ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[var(--r-lg)]" />
          ))}
        </div>
      ) : results.length === 0 ? (
        query || filterCount || quick !== "all" ? (
          <EmptyState
            icon={SearchX}
            title="Sem movimentos neste período."
            description="Os teus registos aparecerão aqui."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setRawQuery("");
                  setQuick("all");
                  setFilters(EMPTY_FILTERS);
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Receipt}
            title="Sem movimentos neste período."
            description="Os teus registos aparecerão aqui."
            action={<Button onClick={openQuickActions}>Adicionar movimento</Button>}
          />
        )
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="sticky top-0 z-10 -mx-5 mb-2 flex items-baseline justify-between bg-background/90 px-5 py-1.5 backdrop-blur lg:mx-0 lg:px-0">
                <h2 className="type-section uppercase">{group.label}</h2>
                {group.spent > 0 ? (
                  <p className="numeric type-meta">
                    {formatMoney(group.spent, currency, { withSymbol: false, compactDecimals: true })}
                  </p>
                ) : null}
              </div>
              <div className="list-group">
                {group.items.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    categories={ledger.categories}
                    accounts={setup.accounts}
                    buckets={setup.ruleItems}
                    currencyCode={currency}
                    onOpen={setSelected}
                  />
                ))}
              </div>
            </section>
          ))}

          {visible < results.length ? (
            <Button variant="secondary" className="w-full" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Mostrar mais
            </Button>
          ) : null}
        </div>
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="overflow-y-auto bg-background sm:max-w-md">
          <SheetHeader className="px-4">
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <div className="px-4">
            <FilterSheet
              filters={filters}
              onChange={setFilters}
              onClose={() => setFiltersOpen(false)}
              categories={ledger.categories}
              accounts={setup.accounts}
              buckets={setup.ruleItems}
              allTags={allTags}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="overflow-y-auto bg-background sm:max-w-md">
          <SheetHeader className="px-4">
            <SheetTitle>Detalhe</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8">
            {selected ? <TransactionDetail tx={selected} onClose={() => setSelected(null)} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function groupByDay(transactions: Transaction[]) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = tx.occurredAt.slice(0, 10);
    map.set(key, [...(map.get(key) ?? []), tx]);
  }

  return [...map.entries()].map(([key, items]) => ({
    key,
    label:
      key === today
        ? "Hoje"
        : key === yesterday
          ? "Ontem"
          : new Date(key).toLocaleDateString("pt-PT", { day: "numeric", month: "short" }),
    items,
    spent: items.filter((tx) => tx.kind === "expense").reduce((sum, tx) => sum + tx.amountMinor, 0),
  }));
}
