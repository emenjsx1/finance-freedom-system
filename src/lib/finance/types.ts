/** Domain model for Personal Finance OS. Presentation-free. */

export type AccountType = "bank" | "mobile_wallet" | "cash" | "savings" | "card" | "other";

export type BucketKind = "protected" | "wealth" | "goals" | "life" | "family" | "free";

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
  /** Integer minor units. */
  balanceMinor: number;
  archived?: boolean;
}

export interface Bucket {
  id: string;
  name: string;
  kind: BucketKind;
  icon: string;
  balanceMinor: number;
}

export interface AllocationRuleItem {
  id: string;
  name: string;
  /** Whole or fractional percent, must sum to 100 across a rule. */
  percentage: number;
  icon: string;
  kind: BucketKind;
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
