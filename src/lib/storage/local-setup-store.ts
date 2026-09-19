/**
 * TEMPORARY persistence layer.
 *
 * The app's real source of truth is the backend (profiles, accounts, buckets,
 * allocation_rules, ...). Until the backend is enabled, onboarding output and
 * the money architecture are kept here so the product is usable end-to-end.
 * The shape mirrors the domain model so swapping this module for backend
 * queries is a contained change.
 */
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type Account,
  type AllocationRuleItem,
  type ExchangeRate,
  type NotificationPreferences,
} from "@/lib/finance/types";
import { DEFAULT_CURRENCY_CODE } from "@/lib/finance/currency";

const STORAGE_KEY = "pfos.setup.v1";

export interface SetupState {
  fullName: string;
  currencyCode: string;
  ruleItems: AllocationRuleItem[];
  accounts: Account[];
  exchangeRates: ExchangeRate[];
  notifications: NotificationPreferences;
  /** Hides every monetary value across the app. */
  privacyMode: boolean;
  onboardingCompleted: boolean;
  /** Set once the old fixed-wallet architecture has been cleaned up. */
  moneyModelMigratedAt?: string | undefined;
}

/**
 * No universal purposes. A purpose exists only because the person created a
 * plan, protected money, or named one themselves. The old fixed split
 * (Construção 40 / Objetivos 20 / Vida 20 / Família 10 / Livre 10) was a system
 * assumption, not the person's decision, and is gone.
 */
export const DEFAULT_RULE_ITEMS: AllocationRuleItem[] = [];

/** Ids of the removed fixed split, recognised only to migrate old devices. */
export const LEGACY_RULE_ITEM_IDS = ["r1", "r2", "r3", "r4", "r5"] as const;

export const EMPTY_SETUP: SetupState = {
  fullName: "",
  currencyCode: DEFAULT_CURRENCY_CODE,
  ruleItems: DEFAULT_RULE_ITEMS,
  accounts: [],
  exchangeRates: [],
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  privacyMode: false,
  onboardingCompleted: false,
};

/** Fills Phase 04 fields for data created by earlier phases. */
function normalize(state: SetupState): SetupState {
  return {
    ...state,
    accounts: (state.accounts ?? []).map((account, index) => ({
      includeInNetWorth: true,
      currencyCode: state.currencyCode,
      order: index,
      ...account,
    })),
    ruleItems: (state.ruleItems ?? []).map((item, index) => ({
      order: index,
      ...item,
    })),
    exchangeRates: state.exchangeRates ?? [],
  };
}

export function loadSetup(): SetupState {
  if (typeof window === "undefined") return EMPTY_SETUP;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SETUP;
    return normalize({ ...EMPTY_SETUP, ...(JSON.parse(raw) as Partial<SetupState>) });
  } catch {
    return EMPTY_SETUP;
  }
}

export function saveSetup(state: SetupState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearSetup(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
