import type { BucketKind } from "./types";

export type TxKind = "income" | "expense" | "transfer" | "reallocation";
export type MoneyType = "personal" | "business";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  /** Data URL preview. Replaced by secure storage paths once data lives in the backend. */
  dataUrl?: string;
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

  categoryId?: string;
  merchant?: string;
  description?: string;
  note?: string;
  tags: string[];
  attachments: Attachment[];

  /** expense: paid from / income: received into */
  accountId?: string;
  /** expense: purpose bucket */
  bucketId?: string;
  /** income: distribution across buckets */
  allocations?: Allocation[];
  /** transfer */
  fromAccountId?: string;
  toAccountId?: string;
  /** reallocation */
  fromBucketId?: string;
  toBucketId?: string;

  /** Set when created from a recurring rule. */
  recurringId?: string;
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
  customIntervalDays?: number;
  startDate: string;
  endDate?: string;
  mode: RecurrenceMode;
  active: boolean;
  categoryId?: string;
  accountId?: string;
  bucketId?: string;
  isSubscription?: boolean;
  /** ISO date of the last occurrence marked paid or skipped. */
  lastHandledAt?: string;
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
  | "transaction_deleted";
