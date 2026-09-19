/** Domain model for Personal Norte. Presentation-free. */

export type AccountType =
  | "bank"
  | "mobile_wallet"
  | "cash"
  | "savings"
  | "investment"
  | "prepaid_card"
  | "credit"
  | "other";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Conta bancária",
  mobile_wallet: "Carteira móvel",
  cash: "Dinheiro físico",
  savings: "Poupança",
  investment: "Investimento",
  prepaid_card: "Cartão pré-pago",
  credit: "Crédito",
  other: "Outro",
};

/** Credit accounting is not implemented yet — the type exists for the architecture only. */
export const CREDIT_ACCOUNT_TYPES: AccountType[] = ["credit"];

export type BucketKind = "protected" | "wealth" | "goals" | "life" | "family" | "free";

/**
 * NORMAL — standard behaviour.
 * PROTECTED — deliberate confirmation with a reason before money leaves.
 * LOCKED_PREPARED — architecture only; behaves like PROTECTED today.
 */
export type ProtectionLevel = "normal" | "protected" | "locked_prepared";

export type TransactionKind = "income" | "expense" | "transfer";

export interface Profile {
  id: string;
  fullName: string;
  currencyCode: string;
  onboardingCompleted: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Integer minor units, in this account's own currency. */
  balanceMinor: number;
  /** Defaults to the profile's base currency. */
  currencyCode?: string | undefined;
  institution?: string | undefined;
  /** Only ever the last 4 digits — never a full account or card number. */
  last4?: string | undefined;
  icon?: string | undefined;
  color?: string | undefined;
  includeInNetWorth?: boolean | undefined;
  notes?: string | undefined;
  order?: number | undefined;
  archived?: boolean;
  isDefaultSpending?: boolean | undefined;
  isDefaultIncome?: boolean | undefined;
  /** User-defined low-balance threshold. The app never invents one. */
  lowBalanceThresholdMinor?: number | undefined;
}

export interface Bucket {
  id: string;
  name: string;
  kind: BucketKind;
  icon: string;
  balanceMinor: number;
}

/**
 * Where a purpose came from. A purpose answers "what is this money for" — it is
 * never a place where money sits. Physical locations are `Account`.
 */
export type PurposeSource = "plan" | "protection" | "commitment" | "custom" | "legacy";

export interface AllocationRuleItem {
  id: string;
  name: string;
  /** Origin of this purpose. Absent on records created before the cleanup. */
  source?: PurposeSource | undefined;
  /** Set when this purpose is the money side of a plan. One plan, one purpose. */
  planId?: string | undefined;
  /** Whole or fractional percent, must sum to 100 across a rule. */
  percentage: number;
  icon: string;
  kind: BucketKind;
  /** Purpose-wallet behaviour. Resolved from `kind` when absent (see wallet-config). */
  spendable?: boolean | undefined;
  wealthBuilding?: boolean | undefined;
  protectionLevel?: ProtectionLevel | undefined;
  includedInAvailable?: boolean | undefined;
  color?: string | undefined;
  order?: number | undefined;
  archived?: boolean | undefined;
  /** Goal wallets only: what the user is aiming for. Display and reminders only. */
  targetMinor?: number | undefined;
  targetDate?: string | undefined;
  /** Planned monthly contribution, used for reminders. Never moves money by itself. */
  monthlyPlanMinor?: number | undefined;
  /** User-defined low-balance threshold. The app never invents one. */
  lowBalanceThresholdMinor?: number | undefined;
  /** Optional contextual cover image for goal wallets (preset, user or generated). */
  coverImageUrl?: string | undefined;
}

export interface AllocationRule {
  id: string;
  name: string;
  isActive: boolean;
  items: AllocationRuleItem[];
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  accountId: string;
  amountMinor: number;
  description: string;
  occurredAt: string;
  categoryId?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetMinor: number;
  savedMinor: number;
  targetDate?: string;
}

/** Manual FX only for now. Rates are never invented by the app. */
export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  /** 1 base = `rate` quote. */
  rate: number;
  source: "manual" | "external";
  effectiveAt: string;
}

export interface NotificationPreferences {
  monthlySummary: boolean;
  goalMilestones: boolean;
  budgetAlerts: boolean;
  incomeReminders: boolean;
  securityAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  monthlySummary: true,
  goalMilestones: true,
  budgetAlerts: true,
  incomeReminders: false,
  securityAlerts: true,
};
