import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Plus, Receipt, Search, SearchX } from "lucide-react";

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
import type { Transaction } from "@/lib/finance/ledger-types";

export const Route = createFileRoute("/app/transactions")({
  head: () => ({
    meta: [
      { title: "Transações — Finance OS" },
      { name: "description", content: "Todas as entradas, gastos, transferências e redistribuições do teu sistema." },
      { property: "og:title", content: "Transações — Finance OS" },
      { property: "og:description", content: "Todas as entradas, gastos e movimentos do teu sistema financeiro." },
    ],
  }),
  component: TransactionsPage,
});

const PAGE_SIZE = 40;

function TransactionsPage() {
  const { setup } = useSetup();
  const { ledger, hydrated } = useLedger();
  const { openQuickActions } = useTransactionLauncher();
  const isMobile = useIsMobile();

  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<TxFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [cursor, setCursor] = useState(new Date());
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    const id = setTimeout(() => setQuery(rawQuery), 220);
    return () => clearTimeout(id);
  }, [rawQuery]);

  const currency = setup.currencyCode;
  const allTags = useMemo(
    () => [...new Set(ledger.transactions.flatMap((tx) => tx.tags))].sort(),
    [ledger.transactions],
  );

  const monthFiltered = useMemo(() => {
    const usingCustomRange = Boolean(filters.from || filters.to);
    return ledger.transactions.filter((tx) => {
      const date = new Date(tx.occurredAt);
      if (!usingCustomRange) {
        if (date.getFullYear() !== cursor.getFullYear() || date.getMonth() !== cursor.getMonth()) return false;
      }
      return true;
    });
  }, [ledger.transactions, cursor, filters.from, filters.to]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthFiltered
      .filter((tx) => {
        if (filters.kinds.length && !filters.kinds.includes(tx.kind)) return false;
        if (filters.categoryIds.length && !(tx.categoryId && filters.categoryIds.includes(tx.categoryId))) return false;
        if (filters.accountIds.length) {
          const ids = [tx.accountId, tx.fromAccountId, tx.toAccountId].filter(Boolean) as string[];
          if (!ids.some((id) => filters.accountIds.includes(id))) return false;
        }
        if (filters.bucketIds.length) {
          const ids = [tx.bucketId, tx.fromBucketId, tx.toBucketId, ...(tx.allocations ?? []).map((a) => a.bucketId)].filter(Boolean) as string[];
          if (!ids.some((id) => filters.bucketIds.includes(id))) return false;
        }
        if (filters.from && tx.occurredAt.slice(0, 10) < filters.from) return false;
        if (filters.to && tx.occurredAt.slice(0, 10) > filters.to) return false;
        if (filters.minMinor && tx.amountMinor < filters.minMinor) return false;
        if (filters.maxMinor && tx.amountMinor > filters.maxMinor) return false;
        if (filters.tags.length && !tx.tags.some((tag) => filters.tags.includes(tag))) return false;

        if (q) {
          const category = findCategory(ledger.categories, tx.categoryId)?.name ?? "";
          const haystack = [tx.merchant, tx.description, tx.note, category, ...tx.tags]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [monthFiltered, filters, query, ledger.categories]);

  const page = results.slice(0, visible);
  const groups = useMemo(() => groupByDay(page), [page]);
  const totals = monthTotals(ledger.transactions, cursor.getFullYear(), cursor.getMonth(), setup.ruleItems);
  const filterCount = activeFilterCount(filters);

  const monthLabel = cursor.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  const canGoForward = cursor < new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
        <Button size="sm" onClick={openQuickActions}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </header>

      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface px-3 py-2">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize">{monthLabel}</p>
          <p className="numeric text-xs text-muted-foreground">
            Entradas {formatMoney(totals.income, currency, { compactDecimals: true })} · Gastos{" "}
            {formatMoney(totals.expenses, currency, { compactDecimals: true })}
          </p>
        </div>
        <button
          type="button"
          aria-label="Mês seguinte"
          disabled={!canGoForward}
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="rounded-lg p-2 text-muted-foreground disabled:opacity-30 hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Procurar"
            aria-label="Procurar transações"
          />
        </div>
        <Button variant="outline" onClick={() => setFiltersOpen(true)}>
          <Filter className="size-4" />
          {filterCount ? `Filtros (${filterCount})` : "Filtros"}
        </Button>
      </div>

      {!hydrated ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        query || filterCount ? (
          <EmptyState
            icon={SearchX}
            title="Nenhuma transação encontrada."
            description="Nenhuma transação corresponde à tua pesquisa."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setRawQuery("");
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
            title="A tua história financeira começa aqui."
            description="Regista a tua primeira entrada ou despesa para o sistema começar a trabalhar."
            action={<Button onClick={openQuickActions}>Adicionar primeira transação</Button>}
          />
        )
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">{group.label}</h2>
                {group.spent > 0 ? (
                  <p className="numeric text-xs text-muted-foreground">
                    Gastaste {formatMoney(group.spent, currency)}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
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
            <Button variant="outline" className="w-full" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
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
          : new Date(key).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }),
    items,
    spent: items.filter((tx) => tx.kind === "expense").reduce((sum, tx) => sum + tx.amountMinor, 0),
  }));
}
