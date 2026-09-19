import { describe, expect, it } from "vitest";

import { buildSnapshot } from "@/lib/finance/engine";
import type { RecurringRule, Transaction } from "@/lib/finance/ledger-types";
import { DEFAULT_CATEGORIES } from "@/lib/finance/categories";
import { DEFAULT_RULE_ITEMS, EMPTY_SETUP } from "@/lib/storage/local-setup-store";
import type { Account, AllocationRuleItem } from "@/lib/finance/types";
import type { AnalyticsInput } from "@/lib/analytics/service";
import { collectSignals } from "./signals";
import { eventDrafts, scheduledDrafts } from "./rules";
import { stripAmounts, previewText } from "./channels";
import {
  EMPTY_NOTIFICATIONS_STATE,
  ingest,
  isAllowed,
  visibleNotifications,
  type NotificationsState,
} from "./service";
import { DEFAULT_NOTIFICATION_PREFS, type AppNotification, type NotificationPrefs } from "./types";

const accounts: Account[] = [
  { id: "a1", name: "Banco", type: "bank", balanceMinor: 100_000_00, currencyCode: "MZN", includeInNetWorth: true, order: 0 } as Account,
];

const now = new Date(2026, 8, 19, 14, 0, 0);
const day = (n: number, h = 12) => new Date(2026, 8, n, h).toISOString();

function tx(partial: Partial<Transaction> & Pick<Transaction, "id" | "kind" | "amountMinor">): Transaction {
  return {
    occurredAt: day(2),
    createdAt: day(2),
    moneyType: "personal",
    tags: [],
    attachments: [],
    ...partial,
  } as Transaction;
}

function makeInput(
  transactions: Transaction[],
  recurring: RecurringRule[] = [],
  ruleItems: AllocationRuleItem[] = DEFAULT_RULE_ITEMS,
): AnalyticsInput {
  const setup = { ...EMPTY_SETUP, accounts, ruleItems, currencyCode: "MZN", fullName: "Emen Joseph" };
  const snapshot = buildSnapshot({ openingAccounts: accounts, ruleItems, transactions, baseCurrency: "MZN" });
  return { setup, snapshot, transactions, categories: DEFAULT_CATEGORIES, recurring };
}

function state(prefs: Partial<NotificationPrefs> = {}): NotificationsState {
  return {
    ...EMPTY_NOTIFICATIONS_STATE,
    prefs: { ...DEFAULT_NOTIFICATION_PREFS, frequency: "active", dailyBudget: 20, ...prefs },
  };
}

const rule: RecurringRule = {
  id: "r-internet",
  name: "Internet",
  kind: "expense",
  amountMinor: 2_500_00,
  frequency: "monthly",
  startDate: day(20),
  mode: "reminder",
  active: true,
};

describe("phase 08 — notifications", () => {
  it("A: an upcoming recurring payment creates exactly one notification", () => {
    const input = makeInput([], [rule]);
    const drafts = eventDrafts(collectSignals(input, now), {}, now);
    const payments = drafts.filter((d) => d.payload.kind === "upcoming_payment");
    expect(payments).toHaveLength(1);
    expect(payments[0]!.title).toContain("Internet");
  });

  it("B: a retried run creates no duplicate", () => {
    const input = makeInput([], [rule]);
    const drafts = eventDrafts(collectSignals(input, now), {}, now);
    const first = ingest(state(), drafts, now);
    const second = ingest(first.state, drafts, now);
    expect(first.created).toHaveLength(drafts.length);
    expect(second.created).toHaveLength(0);
    expect(second.suppressed.every((s) => s.reason === "duplicate")).toBe(true);
  });

  it("C: quiet hours delay a normal notification", () => {
    const night = new Date(2026, 8, 19, 23, 30);
    const input = makeInput([], [{ ...rule, startDate: day(20) }]);
    const drafts = eventDrafts(collectSignals(input, night), {}, night);
    const result = ingest(state(), drafts, night);
    const created = result.created[0]!;
    expect(new Date(created.deliverAt).getHours()).toBe(8);
    expect(visibleNotifications(result.state, night)).toHaveLength(0);
  });

  it("D: a security event bypasses quiet hours", () => {
    const night = new Date(2026, 8, 19, 23, 30);
    const result = ingest(
      state(),
      [
        {
          dedupeKey: "security:new_login",
          category: "system",
          prefKey: "security",
          priority: "security",
          title: "Nova sessão iniciada.",
          body: "",
          payload: { kind: "security", event: "new_login" },
        },
      ],
      night,
    );
    expect(visibleNotifications(result.state, night)).toHaveLength(1);
  });

  it("E/F: goal milestones and funded fire once each", () => {
    const goals: AllocationRuleItem[] = [
      { id: "g1", name: "Turquia", percentage: 100, icon: "🎯", kind: "goals", targetMinor: 120_000_00 },
    ];
    const half = makeInput(
      [tx({ id: "i1", kind: "income", amountMinor: 60_000_00, allocations: [{ bucketId: "g1", amountMinor: 60_000_00 }] })],
      [],
      goals,
    );
    const milestone = eventDrafts(collectSignals(half, now), {}, now).filter((d) => d.payload.kind === "goal_milestone");
    expect(milestone).toHaveLength(1);
    expect(milestone[0]!.title).toContain("50%");

    const full = makeInput(
      [tx({ id: "i2", kind: "income", amountMinor: 120_000_00, allocations: [{ bucketId: "g1", amountMinor: 120_000_00 }] })],
      [],
      goals,
    );
    const fundedDrafts = eventDrafts(collectSignals(full, now), {}, now).filter((d) => d.payload.kind === "goal_funded");
    expect(fundedDrafts).toHaveLength(1);

    const once = ingest(state(), fundedDrafts, now);
    const twice = ingest(once.state, fundedDrafts, now);
    expect(twice.created).toHaveLength(0);
  });

  it("G: unallocated money respects the cooldown", () => {
    const input = makeInput([tx({ id: "adj", kind: "adjustment", amountMinor: 20_000_00, direction: "positive" })]);
    const fresh = eventDrafts(collectSignals(input, now), {}, now).filter((d) => d.payload.kind === "unallocated_money");
    expect(fresh.length).toBeGreaterThan(0);
    const amount = (fresh[0]!.payload as { amountMinor: number }).amountMinor;
    const cooled = eventDrafts(
      collectSignals(input, now),
      { unallocated: { at: new Date(now.getTime() - 86_400_000).toISOString(), value: amount } },
      now,
    ).filter((d) => d.payload.kind === "unallocated_money");
    expect(cooled).toHaveLength(0);
  });

  it("H: the weekly review uses the analytics values", () => {
    const input = makeInput([
      tx({ id: "i1", kind: "income", amountMinor: 50_000_00, occurredAt: day(18), createdAt: day(18) }),
      tx({ id: "e1", kind: "expense", amountMinor: 18_400_00, occurredAt: day(18), createdAt: day(18) }),
    ]);
    const sunday = new Date(2026, 8, 20, 18, 30);
    const drafts = scheduledDrafts(input, collectSignals(input, sunday), DEFAULT_NOTIFICATION_PREFS, sunday);
    const weekly = drafts.find((d) => d.payload.kind === "weekly_review");
    expect(weekly).toBeDefined();
    const payload = weekly!.payload as { incomeMinor: number; expensesMinor: number };
    expect(payload.incomeMinor).toBe(50_000_00);
    expect(payload.expensesMinor).toBe(18_400_00);
  });

  it("L: low-balance alerts only fire against a configured threshold", () => {
    const withoutThreshold = makeInput([]);
    expect(
      eventDrafts(collectSignals(withoutThreshold, now), {}, now).filter((d) => d.payload.kind === "low_account_balance"),
    ).toHaveLength(0);

    const guarded: Account[] = [{ ...accounts[0]!, balanceMinor: 1_000_00, lowBalanceThresholdMinor: 2_000_00 }];
    const setup = { ...EMPTY_SETUP, accounts: guarded, currencyCode: "MZN" };
    const input: AnalyticsInput = {
      setup,
      snapshot: buildSnapshot({ openingAccounts: guarded, ruleItems: DEFAULT_RULE_ITEMS, transactions: [], baseCurrency: "MZN" }),
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      recurring: [],
    };
    const drafts = eventDrafts(collectSignals(input, now), {}, now).filter((d) => d.payload.kind === "low_account_balance");
    expect(drafts).toHaveLength(1);
  });

  it("M: a private preview carries no amount", () => {
    const notification = {
      title: "Internet vence amanhã",
      body: "2 500,00 MT",
    } as AppNotification;
    expect(previewText(notification, "private").body).not.toMatch(/\d/);
    expect(stripAmounts("Gastaste 1.500 MZN em Alimentação")).not.toMatch(/1\.500/);
    expect(previewText(notification, "details").body).toContain("2 500");
  });

  it("P: a disabled category stops producing notifications", () => {
    const prefs: NotificationPrefs = {
      ...DEFAULT_NOTIFICATION_PREFS,
      frequency: "active",
      categories: {
        ...DEFAULT_NOTIFICATION_PREFS.categories,
        category_insights: { inApp: false, push: false, email: false },
      },
    };
    expect(isAllowed(prefs, "category_insights")).toBe(false);
    const result = ingest(
      { ...EMPTY_NOTIFICATIONS_STATE, prefs },
      [
        {
          dedupeKey: "insight:x",
          category: "agent",
          prefKey: "category_insights",
          priority: "low",
          title: "Alimentação subiu 24%.",
          body: "",
          payload: { kind: "insight", insightId: "x" },
        },
      ],
      now,
    );
    expect(result.created).toHaveLength(0);
    expect(result.suppressed[0]!.reason).toBe("preference");
  });

  it("budget: non-critical notifications stop at the daily limit", () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, frequency: "active" as const, dailyBudget: 1 };
    const drafts = [1, 2, 3].map((n) => ({
      dedupeKey: `insight:${n}`,
      category: "agent" as const,
      prefKey: "agent_insights" as const,
      priority: "low" as const,
      title: `Observação ${n}`,
      body: "",
      payload: { kind: "insight" as const, insightId: String(n) },
    }));
    const result = ingest({ ...EMPTY_NOTIFICATIONS_STATE, prefs }, drafts, now);
    expect(result.created).toHaveLength(1);
    expect(result.suppressed.filter((s) => s.reason === "budget")).toHaveLength(2);
  });
});
