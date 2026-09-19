/**
 * TEMPORARY persistence for the ledger (device-local).
 * Mirrors the future backend tables: transactions, transaction_categories,
 * transaction_tags, recurring_transactions, transaction_attachments.
 */
import { DEFAULT_CATEGORIES, type Category } from "@/lib/finance/categories";
import type { RecurringRule, Transaction } from "@/lib/finance/ledger-types";

const STORAGE_KEY = "pfos.ledger.v1";

export interface LedgerState {
  transactions: Transaction[];
  categories: Category[];
  recurring: RecurringRule[];
}

export const EMPTY_LEDGER: LedgerState = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  recurring: [],
};

export function loadLedger(): LedgerState {
  if (typeof window === "undefined") return EMPTY_LEDGER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_LEDGER;
    const parsed = JSON.parse(raw) as Partial<LedgerState>;
    return {
      transactions: parsed.transactions ?? [],
      categories: parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES,
      recurring: parsed.recurring ?? [],
    };
  } catch {
    return EMPTY_LEDGER;
  }
}

export function saveLedger(state: LedgerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded (usually a large attachment). The caller surfaces the error.
    throw new Error("storage_full");
  }
}
