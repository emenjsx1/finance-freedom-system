import type { BucketKind } from "./types";

/**
 * `reservation` classifies money that already sits in an account as being for
 * a purpose. `release` undoes it. Neither moves a single metical between
 * accounts — only `transfer` does that. `reallocation` moves money from one
 * purpose to another without touching accounts either.
 */
export type TxKind =
  | "income"
  | "expense"
  | "transfer"
  | "reservation"
  | "release"
  | "reallocation"
  | "adjustment";
export type MoneyType = "personal" | "business";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  /** Path inside the private receipts bucket. Read only via signed URLs. */
  storagePath?: string | undefined;
  /** Local-only preview used when the person is not signed in. */
  dataUrl?: string | undefined;
}

export interface Allocation {
  bucketId: string;
  amountMinor: number;
}

export interface Transaction {
  id: string;
  kind: TxKind;
  /** Always positive integer minor units. Direction comes from `kind`. */
  amountMinor: number;
  /** ISO timestamp. */
  occurredAt: string;
  createdAt: string;
  moneyType: MoneyType;

  categoryId?: string | undefined;
  merchant?: string | undefined;
  description?: string | undefined;
  note?: string | undefined;
  tags: string[];
  attachments: Attachment[];

  /** expense: paid from / income: received into */
  accountId?: string | undefined;
  /** expense: purpose bucket */
  bucketId?: string | undefined;
  /** income: distribution across buckets */
  allocations?: Allocation[] | undefined;
  /** transfer */
  fromAccountId?: string | undefined;
  toAccountId?: string | undefined;
  /** reallocation */
  fromBucketId?: string | undefined;
  toBucketId?: string | undefined;

  /** adjustment: whether the correction adds or removes physical money */
  direction?: "positive" | "negative" | undefined;
  /** adjustment / protected withdrawal: user-supplied explanation, kept private */
  adjustmentReason?: string | undefined;
  protectedReason?: string | undefined;

  /** Set when created from a recurring rule. */
  recurringId?: string | undefined;
}

export type Frequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "yearly"
  | "custom";

export type RecurrenceMode = "reminder" | "auto";

export interface RecurringRule {
  id: string;
  name: string;
  kind: Exclude<TxKind, "reallocation">;
  amountMinor: number;
  frequency: Frequency;
  /** Days between occurrences when frequency === "custom". */
  customIntervalDays?: number | undefined;
  startDate: string;
  endDate?: string | undefined;
  mode: RecurrenceMode;
  active: boolean;
  categoryId?: string | undefined;
  accountId?: string | undefined;
  bucketId?: string | undefined;
  isSubscription?: boolean | undefined;
  /** ISO date of the last occurrence marked paid or skipped. */
  lastHandledAt?: string | undefined;
}

export interface BucketView {
  id: string;
  name: string;
  icon: string;
  kind: BucketKind;
  balanceMinor: number;
}

/** Notification events prepared for a future push pipeline. */
export type NotificationEvent =
  | "recurring_transaction_due"
  | "recurring_transaction_overdue"
  | "large_expense_created"
  | "subscription_due"
  | "transaction_created"
  | "transaction_updated"
  | "transaction_deleted"
  | "account_reconciled"
  | "balance_adjusted"
  | "money_unallocated"
  | "protected_money_withdrawn"
  | "wallet_low_balance"
  | "account_low_balance";
