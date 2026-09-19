import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSetup } from "@/hooks/use-setup";
import { buildSnapshot, type LedgerSnapshot } from "@/lib/finance/engine";
import type { Category } from "@/lib/finance/categories";
import type { NotificationEvent, RecurringRule, Transaction } from "@/lib/finance/ledger-types";
import { EMPTY_LEDGER, loadLedger, saveLedger, type LedgerState } from "@/lib/storage/ledger-store";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Interaction hooks kept clean for a future native haptics wrapper. */
export function haptic(kind: "success" | "warning" | "selection") {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const pattern = kind === "success" ? 12 : kind === "warning" ? [10, 40, 10] : 6;
    try {
      navigator.vibrate(pattern as number | number[]);
    } catch {
      /* not supported */
    }
  }
}

/** Notification events prepared for a future delivery pipeline. */
export function emitNotificationEvent(event: NotificationEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(`pfos:${event}`, { detail: payload }));
}

interface LedgerContextValue {
  ledger: LedgerState;
  hydrated: boolean;
  snapshot: LedgerSnapshot;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  upsertCategory: (category: Category) => void;
  archiveCategory: (id: string, archived: boolean) => void;
  upsertRecurring: (rule: RecurringRule) => void;
  deleteRecurring: (id: string) => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { setup } = useSetup();
  const [ledger, setLedger] = useState<LedgerState>(EMPTY_LEDGER);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLedger(loadLedger());
    setHydrated(true);
  }, []);

  const commit = useCallback((updater: (prev: LedgerState) => LedgerState) => {
    setLedger((prev) => {
      const next = updater(prev);
      saveLedger(next);
      return next;
    });
  }, []);

  const addTransaction = useCallback(
    (tx: Transaction) => {
      commit((prev) => ({ ...prev, transactions: [tx, ...prev.transactions] }));
      emitNotificationEvent("transaction_created", { id: tx.id, kind: tx.kind });
    },
    [commit],
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Transaction>) => {
      // Balances are derived, so replacing the row reverses the old effect and
      // applies the new one in one atomic state update.
      commit((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)),
      }));
      emitNotificationEvent("transaction_updated", { id });
    },
    [commit],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      commit((prev) => ({ ...prev, transactions: prev.transactions.filter((tx) => tx.id !== id) }));
      emitNotificationEvent("transaction_deleted", { id });
    },
    [commit],
  );

  const upsertCategory = useCallback(
    (category: Category) => {
      commit((prev) => ({
        ...prev,
        categories: prev.categories.some((c) => c.id === category.id)
          ? prev.categories.map((c) => (c.id === category.id ? category : c))
          : [...prev.categories, category],
      }));
    },
    [commit],
  );

  const archiveCategory = useCallback(
    (id: string, archived: boolean) => {
      // Archiving never removes the row, so existing transactions keep their label.
      commit((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => (c.id === id ? { ...c, archived } : c)),
      }));
    },
    [commit],
  );

  const upsertRecurring = useCallback(
    (rule: RecurringRule) => {
      commit((prev) => ({
        ...prev,
        recurring: prev.recurring.some((r) => r.id === rule.id)
          ? prev.recurring.map((r) => (r.id === rule.id ? rule : r))
          : [...prev.recurring, rule],
      }));
    },
    [commit],
  );

  const deleteRecurring = useCallback(
    (id: string) => {
      commit((prev) => ({ ...prev, recurring: prev.recurring.filter((r) => r.id !== id) }));
    },
    [commit],
  );

  const snapshot = useMemo(
    () =>
      buildSnapshot({
        openingAccounts: setup.accounts,
        ruleItems: setup.ruleItems,
        transactions: ledger.transactions,
      }),
    [setup.accounts, setup.ruleItems, ledger.transactions],
  );

  const value = useMemo(
    () => ({
      ledger,
      hydrated,
      snapshot,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      upsertCategory,
      archiveCategory,
      upsertRecurring,
      deleteRecurring,
    }),
    [
      ledger,
      hydrated,
      snapshot,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      upsertCategory,
      archiveCategory,
      upsertRecurring,
      deleteRecurring,
    ],
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerContextValue {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used inside LedgerProvider");
  return ctx;
}
