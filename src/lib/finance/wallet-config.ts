import { ACCOUNT_SYMBOL_KEYS, WALLET_SYMBOL_KEYS } from "@/lib/icons/symbols";
/**
 * Purpose-wallet behaviour.
 *
 * Wallets created before Phase 04 only carry a `kind`, so behaviour is
 * resolved from that kind unless the wallet explicitly overrides it.
 */
import type { AllocationRuleItem, BucketKind, ProtectionLevel } from "./types";

export interface WalletBehaviour {
  spendable: boolean;
  wealthBuilding: boolean;
  protectionLevel: ProtectionLevel;
  includedInAvailable: boolean;
}

const BY_KIND: Record<BucketKind, WalletBehaviour> = {
  protected: { spendable: false, wealthBuilding: false, protectionLevel: "protected", includedInAvailable: false },
  wealth: { spendable: false, wealthBuilding: true, protectionLevel: "protected", includedInAvailable: false },
  goals: { spendable: false, wealthBuilding: true, protectionLevel: "protected", includedInAvailable: false },
  life: { spendable: true, wealthBuilding: false, protectionLevel: "normal", includedInAvailable: true },
  family: { spendable: true, wealthBuilding: false, protectionLevel: "normal", includedInAvailable: true },
  free: { spendable: true, wealthBuilding: false, protectionLevel: "normal", includedInAvailable: true },
};

export function walletBehaviour(item: AllocationRuleItem): WalletBehaviour {
  const base = BY_KIND[item.kind] ?? BY_KIND.free;
  return {
    spendable: item.spendable ?? base.spendable,
    wealthBuilding: item.wealthBuilding ?? base.wealthBuilding,
    protectionLevel: item.protectionLevel ?? base.protectionLevel,
    includedInAvailable: item.includedInAvailable ?? base.includedInAvailable,
  };
}

export function isProtectedWallet(item: AllocationRuleItem): boolean {
  return walletBehaviour(item).protectionLevel !== "normal";
}

export const PROTECTION_LEVEL_LABELS: Record<ProtectionLevel, string> = {
  normal: "Normal",
  protected: "Protegido",
  locked_prepared: "Bloqueio preparado",
};

/** Icon keys from the shared symbol family (@/lib/icons/symbols). Never emoji. */
export const WALLET_ICONS: string[] = [...WALLET_SYMBOL_KEYS];

export const ACCOUNT_ICONS: string[] = [...ACCOUNT_SYMBOL_KEYS];

export const WALLET_COLORS = [
  "#34d399", "#60a5fa", "#f59e0b", "#f472b6", "#a78bfa", "#f87171", "#22d3ee", "#a3e635",
];

/** Wallets in display order, archived last/hidden. */
export function orderedWallets(items: AllocationRuleItem[], includeArchived = false): AllocationRuleItem[] {
  return items
    .filter((item) => includeArchived || !item.archived)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.order ?? a.index) - (b.item.order ?? b.index) || a.index - b.index)
    .map(({ item }) => item);
}
