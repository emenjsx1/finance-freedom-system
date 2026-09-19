/**
 * Financial integrity checks.
 *
 * The engine derives every balance from the movement list, so it can never
 * "lose" money — but invalid movements (spending from a wallet with no money,
 * pointing at a deleted account) can still produce logically impossible states
 * such as a negative reserved balance. These checks detect exactly that, and
 * the app prevents the invalid operation at the domain layer before it happens.
 */
import type { LedgerInput, LedgerSnapshot } from "./engine";
import type { Transaction } from "./ledger-types";
import type { AllocationRuleItem } from "./types";

export type IntegrityCode =
  | "negative_wallet"
  | "purpose_exceeds_money"
  | "orphan_allocation"
  | "missing_account"
  | "missing_wallet"
  | "income_allocation_mismatch"
  | "negative_account"
  | "unconverted_currency";

export interface IntegrityIssue {
  code: IntegrityCode;
  /** `error` = logically impossible. `warning` = worth looking at. */
  severity: "error" | "warning";
  title: string;
  detail: string;
  walletId?: string;
  accountId?: string;
  transactionId?: string;
  /** Positive minor amount involved, when meaningful. */
  amountMinor?: number;
}

export interface IntegrityReport {
  ok: boolean;
  errorCount: number;
  warningCount: number;
  issues: IntegrityIssue[];
  /** total = available + reserved + unallocated must always hold. */
  balanceEquationHolds: boolean;
}

/** How much can still leave this wallet without creating an impossible state. */
export function walletAvailableMinor(snapshot: LedgerSnapshot, walletId: string | undefined): number {
  if (!walletId) return 0;
  return snapshot.bucketBalances[walletId] ?? 0;
}

/**
 * Domain guard for any operation that takes money OUT of a wallet.
 * Returns a human message when the operation would push the wallet negative.
 */
export function debitWalletError(
  snapshot: LedgerSnapshot,
  walletId: string | undefined,
  amountMinor: number,
  walletName?: string,
  /** Amount already booked against this wallet by the movement being edited. */
  creditBackMinor = 0,
): string | null {
  if (!walletId) return null;
  if (amountMinor <= 0) return null;
  const available = walletAvailableMinor(snapshot, walletId) + creditBackMinor;
  if (amountMinor <= available) return null;
  const name = walletName ? `"${name_(walletName)}"` : "Esse propósito";
  if (available <= 0) {
    return `${name} não tem dinheiro disponível. Escolhe outro propósito ou distribui dinheiro primeiro.`;
  }
  return `${name} só tem ${formatShort(available)} disponíveis. Reduz o valor ou escolhe outro propósito.`;
}

function name_(value: string) {
  return value.trim();
}

function formatShort(minor: number): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(minor / 100);
}

export function checkIntegrity(input: LedgerInput, snapshot: LedgerSnapshot): IntegrityReport {
  const issues: IntegrityIssue[] = [];
  const accountIds = new Set(input.openingAccounts.map((a) => a.id));
  const walletById = new Map<string, AllocationRuleItem>(input.ruleItems.map((r) => [r.id, r]));

  for (const [walletId, balance] of Object.entries(snapshot.bucketBalances)) {
    if (balance >= 0) continue;
    const wallet = walletById.get(walletId);
    issues.push({
      code: "negative_wallet",
      severity: "error",
      title: `${wallet?.name ?? "Propósito"} com saldo negativo`,
      detail:
        "Saiu mais dinheiro deste propósito do que ele tinha. Isto torna o dinheiro reservado impossível.",
      walletId,
      amountMinor: Math.abs(balance),
    });
  }

  if (snapshot.unallocatedMinor < 0) {
    issues.push({
      code: "purpose_exceeds_money",
      severity: "error",
      title: "Os propósitos somam mais do que o dinheiro que existe",
      detail:
        "A soma dos propósitos ultrapassa o dinheiro nas contas. Um registo antigo está a atribuir dinheiro que não existe.",
      amountMinor: Math.abs(snapshot.unallocatedMinor),
    });
  }

  for (const account of input.openingAccounts) {
    const balance = snapshot.accountBalances[account.id] ?? 0;
    if (balance < 0) {
      issues.push({
        code: "negative_account",
        severity: "warning",
        title: `${account.name} está negativa`,
        detail: "Verifica o saldo real desta conta e regista um ajuste se for preciso.",
        accountId: account.id,
        amountMinor: Math.abs(balance),
      });
    }
  }

  /** One card per missing purpose, not one per movement. */
  const orphanPurposes = new Map<string, { movements: number; amountMinor: number }>();
  const noteOrphan = (walletId: string, amountMinor: number) => {
    const current = orphanPurposes.get(walletId) ?? { movements: 0, amountMinor: 0 };
    orphanPurposes.set(walletId, {
      movements: current.movements + 1,
      amountMinor: current.amountMinor + amountMinor,
    });
  };

  for (const tx of input.transactions) {
    const refs: Array<string | undefined> = [tx.accountId, tx.fromAccountId, tx.toAccountId];
    for (const ref of refs) {
      if (ref && !accountIds.has(ref)) {
        issues.push({
          code: "missing_account",
          severity: "error",
          title: "Movimento sem conta válida",
          detail: "Este movimento aponta para uma conta que já não existe.",
          transactionId: tx.id,
          accountId: ref,
        });
      }
    }

    const walletRefs: Array<string | undefined> = [tx.bucketId, tx.fromBucketId, tx.toBucketId];
    for (const ref of walletRefs) {
      if (ref && !walletById.has(ref)) {
        issues.push({
          code: "missing_wallet",
          severity: "error",
          title: "Movimento sem propósito válido",
          detail: "Este movimento aponta para um propósito que já não existe.",
          transactionId: tx.id,
          walletId: ref,
        });
      }
    }

    for (const allocation of tx.allocations ?? []) {
      if (!walletById.has(allocation.bucketId)) {
        issues.push({
          code: "orphan_allocation",
          severity: "error",
          title: "Distribuição órfã",
          detail: "Parte deste movimento foi atribuída a um propósito que já não existe.",
          transactionId: tx.id,
          walletId: allocation.bucketId,
          amountMinor: Math.abs(allocation.amountMinor),
        });
      }
    }

    if (tx.kind === "income" && tx.moneyType !== "business" && (tx.allocations?.length ?? 0) > 0) {
      const total = (tx.allocations ?? []).reduce((sum, a) => sum + a.amountMinor, 0);
      if (total !== tx.amountMinor) {
        issues.push({
          code: "income_allocation_mismatch",
          severity: "error",
          title: "Entrada distribuída de forma incompleta",
          detail: "A distribuição desta entrada não soma exatamente o valor recebido.",
          transactionId: tx.id,
          amountMinor: Math.abs(tx.amountMinor - total),
        });
      }
    }
  }

  for (const code of snapshot.unconvertedCurrencies) {
    issues.push({
      code: "unconverted_currency",
      severity: "warning",
      title: `Sem taxa de câmbio para ${code}`,
      detail: "Dinheiro nesta moeda fica de fora do total até definires uma taxa.",
    });
  }

  const balanceEquationHolds =
    snapshot.wealthMinor === snapshot.purposeTotalMinor + snapshot.unallocatedMinor;
  if (!balanceEquationHolds) {
    issues.push({
      code: "purpose_exceeds_money",
      severity: "error",
      title: "Os totais não fecham",
      detail: "O total não é igual à soma do dinheiro com propósito e do dinheiro por distribuir.",
    });
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  return {
    ok: errorCount === 0,
    errorCount,
    warningCount: issues.length - errorCount,
    issues,
    balanceEquationHolds,
  };
}

/** Wallets that can absorb a correction of `amountMinor`. */
export function correctionSources(snapshot: LedgerSnapshot, amountMinor: number, excludeId?: string) {
  return snapshot.wallets
    .filter((w) => w.id !== excludeId && !w.archived && w.balanceMinor >= amountMinor)
    .sort((a, b) => b.balanceMinor - a.balanceMinor);
}

/** True when a movement would be rejected by the domain guards. */
export function isImpossibleTransaction(tx: Transaction, snapshot: LedgerSnapshot): boolean {
  if (tx.kind === "expense") return walletAvailableMinor(snapshot, tx.bucketId) < 0;
  if (tx.kind === "reallocation") return walletAvailableMinor(snapshot, tx.fromBucketId) < 0;
  return false;
}
