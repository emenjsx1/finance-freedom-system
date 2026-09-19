/**
 * TEMPORARY persistence layer.
 *
 * The app's real source of truth is the backend (profiles, accounts, buckets,
 * allocation_rules, ...). Until the backend is enabled, onboarding output is
 * kept here so the product is usable end-to-end. The shape mirrors the domain
 * model so swapping this module for backend queries is a contained change.
 */
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type Account,
  type AllocationRuleItem,
  type NotificationPreferences,
} from "@/lib/finance/types";
import { DEFAULT_CURRENCY_CODE } from "@/lib/finance/currency";

const STORAGE_KEY = "pfos.setup.v1";

export interface SetupState {
  fullName: string;
  currencyCode: string;
  ruleItems: AllocationRuleItem[];
  accounts: Account[];
  notifications: NotificationPreferences;
  onboardingCompleted: boolean;
}

export const DEFAULT_RULE_ITEMS: AllocationRuleItem[] = [
  { id: "r1", name: "Construção", percentage: 40, icon: "🏗️", kind: "wealth" },
  { id: "r2", name: "Objetivos", percentage: 20, icon: "🎯", kind: "goals" },
  { id: "r3", name: "Vida", percentage: 20, icon: "🏠", kind: "life" },
  { id: "r4", name: "Família", percentage: 10, icon: "❤️", kind: "family" },
  { id: "r5", name: "Livre", percentage: 10, icon: "✨", kind: "free" },
];

export const EMPTY_SETUP: SetupState = {
  fullName: "",
  currencyCode: DEFAULT_CURRENCY_CODE,
  ruleItems: DEFAULT_RULE_ITEMS,
  accounts: [],
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  onboardingCompleted: false,
};

export function loadSetup(): SetupState {
  if (typeof window === "undefined") return EMPTY_SETUP;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SETUP;
    return { ...EMPTY_SETUP, ...(JSON.parse(raw) as Partial<SetupState>) };
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
