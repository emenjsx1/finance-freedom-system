/** Pure helpers that produce the next setup state. No UI, no storage. */
import type { SetupState } from "@/lib/storage/local-setup-store";
import type { Account, AllocationRuleItem } from "./types";

export function upsertAccount(setup: SetupState, account: Account): Partial<SetupState> {
  const exists = setup.accounts.some((a) => a.id === account.id);
  const accounts = exists
    ? setup.accounts.map((a) => (a.id === account.id ? { ...a, ...account } : a))
    : [...setup.accounts, { ...account, order: setup.accounts.length }];

  // A default flag is exclusive across accounts.
  const withDefaults = accounts.map((a) => ({
    ...a,
    isDefaultSpending: account.isDefaultSpending ? a.id === account.id : a.isDefaultSpending,
    isDefaultIncome: account.isDefaultIncome ? a.id === account.id : a.isDefaultIncome,
  }));

  return { accounts: withDefaults };
}

export function setAccountArchived(setup: SetupState, id: string, archived: boolean): Partial<SetupState> {
  return { accounts: setup.accounts.map((a) => (a.id === id ? { ...a, archived } : a)) };
}

export function moveAccount(setup: SetupState, id: string, delta: number): Partial<SetupState> {
  return { accounts: reorder(setup.accounts, id, delta) };
}

export function upsertWallet(setup: SetupState, wallet: AllocationRuleItem): Partial<SetupState> {
  const exists = setup.ruleItems.some((w) => w.id === wallet.id);
  return {
    ruleItems: exists
      ? setup.ruleItems.map((w) => (w.id === wallet.id ? { ...w, ...wallet } : w))
      : [...setup.ruleItems, { ...wallet, order: setup.ruleItems.length }],
  };
}

export function setWalletArchived(setup: SetupState, id: string, archived: boolean): Partial<SetupState> {
  return { ruleItems: setup.ruleItems.map((w) => (w.id === id ? { ...w, archived } : w)) };
}

export function moveWallet(setup: SetupState, id: string, delta: number): Partial<SetupState> {
  return { ruleItems: reorder(setup.ruleItems, id, delta) };
}

function reorder<T extends { id: string; order?: number | undefined }>(list: T[], id: string, delta: number): T[] {
  const sorted = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const index = sorted.findIndex((item) => item.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= sorted.length) return list;
  const next = [...sorted];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved!);
  return next.map((item, position) => ({ ...item, order: position }));
}
