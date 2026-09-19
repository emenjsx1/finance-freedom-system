/**
 * Cloud persistence for every domain.
 *
 * The app keeps its deterministic engine and its state shapes; this module is
 * the only place that knows how those shapes map to the backend tables.
 * Device storage stays as an offline cache — the cloud is the source of truth
 * for a signed-in person.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AgentState } from "@/lib/agent/types";
import type { Account, AllocationRuleItem, ExchangeRate } from "@/lib/finance/types";
import type { NotificationsState } from "@/lib/notifications/service";
import type { Reminder } from "@/lib/reminders/types";
import type { PersonalState } from "@/lib/personal/types";
import type { UserPreferences } from "@/lib/prefs/types";
import type { LedgerState } from "@/lib/storage/ledger-store";
import type { SetupState } from "@/lib/storage/local-setup-store";

/** The generated types do not describe the payload tables; queries stay untyped here. */
const db = supabase as unknown as SupabaseClient;

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ---------------------------------------------------------------- generic IO

interface Payloaded {
  id: string;
}

async function pullPayloads<T extends Payloaded>(table: string): Promise<T[]> {
  const { data, error } = await db.from(table).select("id, payload");
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...(row["payload"] as T), id: row["id"] as string }));
}

async function pushPayloads(table: string, userId: string, items: Payloaded[]): Promise<void> {
  const rows = items.map((item) => ({ id: item.id, user_id: userId, payload: item }));
  if (rows.length > 0) {
    const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
  const keep = items.map((item) => item.id);
  const query = db.from(table).delete().eq("user_id", userId);
  const { error: deleteError } = keep.length
    ? await query.not("id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`)
    : await query;
  if (deleteError) throw deleteError;
}

// ------------------------------------------------------------------- profile

interface SettingsBlob {
  preferences?: UserPreferences;
  notifications?: NotificationsState;
  personal?: { permissions?: PersonalState["permissions"]; headline?: string | undefined };
}

async function readSettings(): Promise<{
  settings: SettingsBlob;
  privacyMode: boolean;
  onboardingCompleted: boolean;
  notificationPreferences: SetupState["notifications"] | null;
} | null> {
  const { data, error } = await db.from("user_settings").select("*").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    settings: (data["appearance"] ?? {}) as SettingsBlob,
    privacyMode: Boolean(data["privacy_mode"]),
    onboardingCompleted: Boolean(data["onboarding_completed"]),
    notificationPreferences: (data["notification_preferences"] ??
      null) as SetupState["notifications"] | null,
  };
}

async function writeSettings(
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await db
    .from("user_settings")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw error;
}

async function mergeSettingsBlob(userId: string, patch: Partial<SettingsBlob>): Promise<void> {
  const current = await readSettings();
  await writeSettings(userId, { appearance: { ...(current?.settings ?? {}), ...patch } });
}

/**
 * The cloud copy wins, but nothing that only exists on this device is thrown
 * away. Dropping a purpose that a recorded movement still points at is what
 * produced "movimento sem propósito válido", so local-only rows are kept and
 * re-uploaded on the next save.
 */
function unionById<T extends { id: string }>(cloud: T[], local: T[]): T[] {
  const seen = new Set(cloud.map((row) => row.id));
  return [...cloud, ...local.filter((row) => !seen.has(row.id))];
}

// --------------------------------------------------------------------- setup

export async function loadCloudSetup(base: SetupState): Promise<SetupState | null> {
  const [{ data: accounts, error: accountsError }, { data: purposes, error: purposesError }, rates, settings, profile] =
    await Promise.all([
      db.from("accounts").select("*").order("order", { ascending: true }),
      db.from("purposes").select("*").order("order", { ascending: true }),
      db.from("exchange_rates").select("*"),
      readSettings(),
      db.from("profiles").select("preferred_name, full_name, base_currency").maybeSingle(),
    ]);
  if (accountsError) throw accountsError;
  if (purposesError) throw purposesError;
  if (rates.error) throw rates.error;

  const hasData = (accounts?.length ?? 0) > 0 || (purposes?.length ?? 0) > 0 || settings !== null;
  if (!hasData) return null;

  return {
    ...base,
    fullName:
      (profile.data?.["preferred_name"] as string | null) ??
      (profile.data?.["full_name"] as string | null) ??
      base.fullName,
    currencyCode: (profile.data?.["base_currency"] as string | null) ?? base.currencyCode,
    accounts: unionById(
      (accounts ?? []).map(
      (row): Account => ({
        id: row["id"] as string,
        name: row["name"] as string,
        type: row["type"] as Account["type"],
        balanceMinor: Number(row["balance_minor"] ?? 0),
        currencyCode: (row["currency_code"] as string) ?? undefined,
        institution: (row["institution"] as string) ?? undefined,
        last4: (row["last4"] as string) ?? undefined,
        icon: (row["icon"] as string) ?? undefined,
        color: (row["color"] as string) ?? undefined,
        includeInNetWorth: Boolean(row["include_in_net_worth"]),
        notes: (row["notes"] as string) ?? undefined,
        order: Number(row["order"] ?? 0),
        archived: Boolean(row["archived"]),
        isDefaultSpending: Boolean(row["is_default_spending"]),
        isDefaultIncome: Boolean(row["is_default_income"]),
        lowBalanceThresholdMinor:
          row["low_balance_threshold_minor"] === null
            ? undefined
            : Number(row["low_balance_threshold_minor"]),
      }),
      ),
      base.accounts,
    ),
    ruleItems: unionById(
      (purposes ?? []).map(
      (row): AllocationRuleItem => ({
        id: row["id"] as string,
        name: row["name"] as string,
        source: (row["source"] as AllocationRuleItem["source"]) ?? undefined,
        planId: (row["plan_id"] as string) ?? undefined,
        percentage: Number(row["percentage"] ?? 0),
        icon: (row["icon"] as string) ?? "star",
        kind: row["kind"] as AllocationRuleItem["kind"],
        spendable: (row["spendable"] as boolean | null) ?? undefined,
        wealthBuilding: (row["wealth_building"] as boolean | null) ?? undefined,
        includedInAvailable: (row["included_in_available"] as boolean | null) ?? undefined,
        protectionLevel: (row["protection_level"] as AllocationRuleItem["protectionLevel"]) ?? undefined,
        color: (row["color"] as string) ?? undefined,
        order: Number(row["order"] ?? 0),
        archived: Boolean(row["archived"]),
        targetMinor: row["target_minor"] === null ? undefined : Number(row["target_minor"]),
        targetDate: (row["target_date"] as string) ?? undefined,
        monthlyPlanMinor:
          row["monthly_plan_minor"] === null ? undefined : Number(row["monthly_plan_minor"]),
        lowBalanceThresholdMinor:
          row["low_balance_threshold_minor"] === null
            ? undefined
            : Number(row["low_balance_threshold_minor"]),
        coverImageUrl: (row["cover_image_url"] as string) ?? undefined,
      }),
      ),
      base.ruleItems,
    ),
    exchangeRates: unionById(
      (rates.data ?? []).map(
      (row): ExchangeRate => ({
        id: row["id"] as string,
        baseCurrency: row["base_currency"] as string,
        quoteCurrency: row["quote_currency"] as string,
        rate: Number(row["rate"]),
        source: row["source"] as ExchangeRate["source"],
        effectiveAt: row["effective_at"] as string,
      }),
      ),
      base.exchangeRates,
    ),
    notifications: settings?.notificationPreferences ?? base.notifications,
    privacyMode: settings?.privacyMode ?? base.privacyMode,
    onboardingCompleted: settings?.onboardingCompleted ?? base.onboardingCompleted,
  };
}

export async function saveCloudSetup(userId: string, state: SetupState): Promise<void> {
  const accountRows = state.accounts.map((account, index) => ({
    id: account.id,
    user_id: userId,
    name: account.name,
    type: account.type,
    currency_code: account.currencyCode ?? state.currencyCode,
    institution: account.institution ?? null,
    last4: account.last4 ?? null,
    icon: account.icon ?? null,
    color: account.color ?? null,
    balance_minor: account.balanceMinor,
    include_in_net_worth: account.includeInNetWorth ?? true,
    is_default_spending: account.isDefaultSpending ?? false,
    is_default_income: account.isDefaultIncome ?? false,
    low_balance_threshold_minor: account.lowBalanceThresholdMinor ?? null,
    notes: account.notes ?? null,
    order: account.order ?? index,
    archived: account.archived ?? false,
  }));
  const purposeRows = state.ruleItems.map((item, index) => ({
    id: item.id,
    user_id: userId,
    name: item.name,
    source: item.source ?? "custom",
    plan_id: item.planId ?? null,
    kind: item.kind,
    icon: item.icon,
    color: item.color ?? null,
    percentage: item.percentage,
    spendable: item.spendable ?? null,
    wealth_building: item.wealthBuilding ?? null,
    included_in_available: item.includedInAvailable ?? null,
    protection_level: item.protectionLevel ?? "normal",
    target_minor: item.targetMinor ?? null,
    target_date: item.targetDate ?? null,
    monthly_plan_minor: item.monthlyPlanMinor ?? null,
    low_balance_threshold_minor: item.lowBalanceThresholdMinor ?? null,
    cover_image_url: item.coverImageUrl ?? null,
    order: item.order ?? index,
    archived: item.archived ?? false,
  }));
  const rateRows = state.exchangeRates.map((rate) => ({
    id: rate.id,
    user_id: userId,
    base_currency: rate.baseCurrency,
    quote_currency: rate.quoteCurrency,
    rate: rate.rate,
    source: rate.source,
    effective_at: rate.effectiveAt,
  }));

  await replaceRows("accounts", userId, accountRows);
  await replaceRows("purposes", userId, purposeRows);
  await replaceRows("exchange_rates", userId, rateRows);
  await writeSettings(userId, {
    notification_preferences: state.notifications,
    privacy_mode: state.privacyMode,
    onboarding_completed: state.onboardingCompleted,
  });
  if (state.fullName || state.currencyCode) {
    const { error } = await db
      .from("profiles")
      .update({ preferred_name: state.fullName || null, base_currency: state.currencyCode })
      .eq("id", userId);
    if (error) throw error;
  }
}

async function replaceRows(
  table: string,
  userId: string,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  if (rows.length > 0) {
    const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
  const keep = rows.map((row) => row["id"] as string);
  const query = db.from(table).delete().eq("user_id", userId);
  const { error } = keep.length
    ? await query.not("id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`)
    : await query;
  if (error) throw error;
}

// -------------------------------------------------------------------- ledger

export async function loadCloudLedger(base: LedgerState): Promise<LedgerState | null> {
  const [transactions, categories, recurring] = await Promise.all([
    pullPayloads<LedgerState["transactions"][number]>("transactions"),
    pullPayloads<LedgerState["categories"][number]>("transaction_categories"),
    pullPayloads<LedgerState["recurring"][number]>("recurring_transactions"),
  ]);
  if (!transactions.length && !categories.length && !recurring.length) return null;
  return {
    transactions: unionById(transactions, base.transactions).sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    ),
    categories: categories.length ? unionById(categories, base.categories) : base.categories,
    recurring: unionById(recurring, base.recurring),
  };
}

export async function saveCloudLedger(userId: string, state: LedgerState): Promise<void> {
  const rows = state.transactions.map((tx) => ({
    id: tx.id,
    user_id: userId,
    payload: tx,
    kind: tx.kind,
    amount_minor: tx.amountMinor,
    occurred_at: tx.occurredAt,
    account_id: tx.accountId ?? null,
  }));
  await replaceRows("transactions", userId, rows);
  await pushPayloads("transaction_categories", userId, state.categories);
  await pushPayloads("recurring_transactions", userId, state.recurring);
}

// ------------------------------------------------------------------ personal

export async function loadCloudPersonal(base: PersonalState): Promise<PersonalState | null> {
  const [plans, direction, context, commitments, strategies, programs, actions, decisions, reflections, evolution, settings] =
    await Promise.all([
      pullPayloads<PersonalState["plans"][number]>("plans"),
      pullPayloads<PersonalState["direction"][number]>("direction_items"),
      pullPayloads<PersonalState["context"][number]>("personal_context"),
      pullPayloads<PersonalState["commitments"][number]>("commitments"),
      pullPayloads<NonNullable<PersonalState["strategy"]>>("strategies"),
      pullPayloads<PersonalState["development"]["programs"][number]>("programs"),
      pullPayloads<PersonalState["development"]["actions"][number]>("actions"),
      pullPayloads<PersonalState["development"]["decisions"][number]>("decisions"),
      pullPayloads<PersonalState["development"]["reflections"][number]>("reflections"),
      pullPayloads<PersonalState["development"]["evolution"][number]>("evolution_events"),
      readSettings(),
    ]);

  const empty =
    !plans.length &&
    !direction.length &&
    !context.length &&
    !commitments.length &&
    !strategies.length &&
    !programs.length &&
    !actions.length &&
    !decisions.length &&
    !reflections.length &&
    !evolution.length;
  if (empty) return null;

  const personal = settings?.settings.personal;
  return {
    ...base,
    headline: personal?.headline ?? base.headline,
    permissions: personal?.permissions ?? base.permissions,
    plans,
    direction,
    context,
    commitments,
    strategy: strategies[0] ?? null,
    development: { ...base.development, programs, actions, decisions, reflections, evolution },
  };
}

export async function saveCloudPersonal(userId: string, state: PersonalState): Promise<void> {
  await Promise.all([
    pushPayloads("plans", userId, state.plans),
    pushPayloads("direction_items", userId, state.direction),
    pushPayloads("personal_context", userId, state.context),
    pushPayloads("commitments", userId, state.commitments),
    pushPayloads("strategies", userId, state.strategy ? [state.strategy] : []),
    pushPayloads("programs", userId, state.development.programs),
    pushPayloads("actions", userId, state.development.actions),
    pushPayloads("decisions", userId, state.development.decisions),
    pushPayloads("reflections", userId, state.development.reflections),
    pushPayloads("evolution_events", userId, state.development.evolution),
  ]);
  await mergeSettingsBlob(userId, {
    personal: { permissions: state.permissions, headline: state.headline },
  });
}

// --------------------------------------------------------------------- agent

export async function loadCloudAgent(base: AgentState): Promise<AgentState | null> {
  const conversations = await pullPayloads<AgentState["conversations"][number]>("agent_threads");
  if (!conversations.length) return null;
  return { ...base, conversations };
}

export async function saveCloudAgent(userId: string, state: AgentState): Promise<void> {
  await pushPayloads("agent_threads", userId, state.conversations);
}

// --------------------------------------------------- preferences + notifications

export async function loadCloudPreferences(): Promise<UserPreferences | null> {
  const settings = await readSettings();
  return settings?.settings.preferences ?? null;
}

export async function saveCloudPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  await mergeSettingsBlob(userId, { preferences: prefs });
}

export async function loadCloudNotifications(): Promise<NotificationsState | null> {
  const [settings, reminders] = await Promise.all([readSettings(), pullReminders()]);
  const stored = settings?.settings.notifications;
  if (!stored) return null;
  return { ...stored, reminders };
}

/** Reminders live in their own table: the server scheduler reads them directly. */
async function pullReminders(): Promise<Reminder[]> {
  const { data, error } = await db.from("reminders").select("id, payload");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row["payload"] as Reminder),
    id: row["id"] as string,
  }));
}

async function pushReminders(userId: string, reminders: Reminder[]): Promise<void> {
  if (reminders.length > 0) {
    const rows = reminders.map((reminder) => ({
      id: reminder.id,
      user_id: userId,
      payload: reminder,
      title: reminder.title,
      scheduled_at: reminder.snoozedUntil ?? reminder.scheduledAt,
      timezone: reminder.timezone,
      status: reminder.status,
      entity_type: reminder.entityType,
      entity_id: reminder.entityId ?? null,
    }));
    const { error } = await db.from("reminders").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
  const keep = reminders.map((reminder) => reminder.id);
  const query = db.from("reminders").delete().eq("user_id", userId);
  const { error } = keep.length
    ? await query.not("id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`)
    : await query;
  if (error) throw error;
}

export async function saveCloudNotifications(
  userId: string,
  state: NotificationsState,
): Promise<void> {
  await pushReminders(userId, state.reminders);
  await mergeSettingsBlob(userId, {
    notifications: {
      ...state,
      reminders: [],
      notifications: state.notifications.slice(0, 100),
      runs: state.runs.slice(0, 50),
    },
  });
}
