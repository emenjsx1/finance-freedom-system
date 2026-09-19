import { ArrowLeftRight, Shuffle } from "lucide-react";

import { findCategory, type Category } from "@/lib/finance/categories";
import { formatMoney } from "@/lib/finance/currency";
import type { Transaction } from "@/lib/finance/ledger-types";
import type { Account, AllocationRuleItem } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export function TransactionRow({
  tx,
  categories,
  accounts,
  buckets,
  currencyCode,
  onOpen,
}: {
  tx: Transaction;
  categories: Category[];
  accounts: Account[];
  buckets: AllocationRuleItem[];
  currencyCode: string;
  onOpen: (tx: Transaction) => void;
}) {
  const category = findCategory(categories, tx.categoryId);
  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name ?? "—";
  const bucketName = (id?: string) => buckets.find((b) => b.id === id)?.name ?? "—";

  let title = tx.merchant || tx.description || category?.name || "Transação";
  let context = "";
  let icon = category?.icon ?? "•";
  let sign = "";
  let amountClass = "text-foreground";

  if (tx.kind === "expense") {
    context = `${category?.name ?? "Sem categoria"} • ${bucketName(tx.bucketId)}`;
    sign = "−";
    amountClass = "text-expense";
  } else if (tx.kind === "income") {
    context = `${category?.name ?? "Entrada"} • ${accountName(tx.accountId)}`;
    sign = "+";
    amountClass = "text-income";
  } else if (tx.kind === "transfer") {
    title = tx.description || "Transferência";
    context = `${accountName(tx.fromAccountId)} → ${accountName(tx.toAccountId)}`;
    icon = "↔";
  } else {
    title = tx.description || "Redistribuição";
    context = `${bucketName(tx.fromBucketId)} → ${bucketName(tx.toBucketId)}`;
    icon = "⇄";
  }

  const time = new Date(tx.occurredAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  return (
    <button
      type="button"
      onClick={() => onOpen(tx)}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-muted-foreground/40"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-base" aria-hidden>
        {tx.kind === "transfer" ? <ArrowLeftRight className="size-4" /> : tx.kind === "reallocation" ? <Shuffle className="size-4" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{context}</span>
      </span>
      <span className="text-right">
        <span className={cn("numeric block text-sm font-semibold", amountClass)}>
          {sign}
          {formatMoney(tx.amountMinor, currencyCode)}
        </span>
        <span className="block text-xs text-muted-foreground">{time}</span>
      </span>
    </button>
  );
}
