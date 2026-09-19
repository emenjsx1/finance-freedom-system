import { haptic as iosHaptic } from "@/lib/ios/haptics";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import { useSetup } from "@/hooks/use-setup";
import { buildSnapshot, type LedgerSnapshot } from "@/lib/finance/engine";
import { checkIntegrity, debitWalletError, type IntegrityReport } from "@/lib/finance/integrity";
import type { Category } from "@/lib/finance/categories";
import type { NotificationEvent, RecurringRule, Transaction } from "@/lib/finance/ledger-types";
import { loadCloudLedger, saveCloudLedger } from "@/lib/backend/cloud-store";
import { useCloudSync } from "@/lib/backend/use-cloud-sync";
import { EMPTY_LEDGER, loadLedger, saveLedger, type LedgerState } from "@/lib/storage/ledger-store";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Re-exported so every call site shares one haptics implementation. */
export function haptic(kind: "success" | "warning" | "selection") {
  iosHaptic(kind === "selection" ? "confirm" : kind);
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

  const applyCloud = useCallback((next: LedgerState) => {
    saveLedger(next);
    setLedger(next);
  }, []);

  useCloudSync({
    state: ledger,
    hydrated,
    apply: applyCloud,
    load: loadCloudLedger,
    save: saveCloudLedger,
  });

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
      if (tx.kind === "reallocation" || tx.kind === "release") {
        return debitWalletError(base, tx.fromBucketId, tx.amountMinor, walletName(tx.fromBucketId));
      }
      if (tx.kind === "reservation" && tx.accountId) {
        // Only money that is not already reserved can receive a purpose.
        const available = base.accountAvailable[tx.accountId] ?? 0;
        if (available < tx.amountMinor) {
          const name = setup.accounts.find((a) => a.id === tx.accountId)?.name ?? "Esta conta";
          return `${name} não tem dinheiro disponível suficiente.`;
        }
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

  const integrity = useMemo(
    () =>
      checkIntegrity(
        {
          openingAccounts: setup.accounts,
          ruleItems: setup.ruleItems,
          transactions: ledger.transactions,
        },
        snapshot,
      ),
    [setup.accounts, setup.ruleItems, ledger.transactions, snapshot],
  );

  const value = useMemo(
    () => ({
      ledger,
      hydrated,
      snapshot,
      integrity,
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
      integrity,
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
