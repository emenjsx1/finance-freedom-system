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
  integrity: IntegrityReport;
  /** Returns false when the domain guards rejected the movement. */
  addTransaction: (tx: Transaction) => boolean;
  updateTransaction: (id: string, patch: Partial<Transaction>) => boolean;
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

  /**
   * Single domain guard for every writer (composer, agent, recurring,
   * reconciliation). A purpose wallet can never end up below zero, so the
   * impossible "reserved = -2.000" state cannot be created at all.
   */
  const guard = useCallback(
    (tx: Transaction, ignoreId?: string): string | null => {
      if (tx.moneyType === "business") return null;
      const transactions = ignoreId
        ? ledger.transactions.filter((t) => t.id !== ignoreId)
        : ledger.transactions;
      const base = buildSnapshot({
        openingAccounts: setup.accounts,
        ruleItems: setup.ruleItems,
        transactions,
      });
      const walletName = (id?: string) => setup.ruleItems.find((r) => r.id === id)?.name;
      if (tx.kind === "expense") {
        return debitWalletError(base, tx.bucketId, tx.amountMinor, walletName(tx.bucketId));
      }
      if (tx.kind === "reallocation") {
        return debitWalletError(base, tx.fromBucketId, tx.amountMinor, walletName(tx.fromBucketId));
      }
      if (tx.kind === "adjustment" && tx.direction === "negative") {
        for (const allocation of tx.allocations ?? []) {
          const error = debitWalletError(
            base,
            allocation.bucketId,
            allocation.amountMinor,
            walletName(allocation.bucketId),
          );
          if (error) return error;
        }
      }
      return null;
    },
    [ledger.transactions, setup.accounts, setup.ruleItems],
  );

  const addTransaction = useCallback(
    (tx: Transaction) => {
      const error = guard(tx);
      if (error) {
        toast.error(error);
        return false;
      }
      // Idempotency: an identical movement recorded twice within a few seconds
      // is a double tap, never two real movements.
      const duplicate = ledger.transactions.some(
        (t) =>
          t.id === tx.id ||
          (t.kind === tx.kind &&
            t.amountMinor === tx.amountMinor &&
            t.occurredAt === tx.occurredAt &&
            t.accountId === tx.accountId &&
            t.bucketId === tx.bucketId &&
            Math.abs(Date.parse(t.createdAt) - Date.parse(tx.createdAt)) < 3000),
      );
      if (duplicate) return false;
      commit((prev) => ({ ...prev, transactions: [tx, ...prev.transactions] }));
      emitNotificationEvent("transaction_created", { id: tx.id, kind: tx.kind });
      return true;
    },
    [commit, guard, ledger.transactions],
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Transaction>) => {
      const current = ledger.transactions.find((t) => t.id === id);
      if (current) {
        const error = guard({ ...current, ...patch } as Transaction, id);
        if (error) {
          toast.error(error);
          return false;
        }
      }
      // Balances are derived, so replacing the row reverses the old effect and
      // applies the new one in one atomic state update.
      commit((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)),
      }));
      emitNotificationEvent("transaction_updated", { id });
      return true;
    },
    [commit, guard, ledger.transactions],
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
