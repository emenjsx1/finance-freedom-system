/**
 * Automation engine.
 *
 * Automations decide WHETHER an optional behaviour runs; the notification
 * rules decide WHAT the resulting message says. Financial actions are only
 * ever prepared — the financial engine executes after the user confirms.
 */
import type { NotificationDraft, PayloadKind } from "@/lib/notifications/types";
import type { Signals } from "@/lib/notifications/signals";
import { localDateKey, localMonthKey } from "@/lib/notifications/time";
import {
  AUTOMATION_TEMPLATES,
  FINANCIAL_ACTIONS,
  type AutomationRule,
  type AutomationRun,
} from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function installDefaultAutomations(now = new Date()): AutomationRule[] {
  return AUTOMATION_TEMPLATES.map((template) => ({
    id: newId(),
    name: template.name,
    enabled: template.defaultEnabled,
    trigger: template.trigger,
    condition: template.condition,
    action: template.action,
    createdAt: now.toISOString(),
    templateId: template.id,
  }));
}

/** Which payload kinds each template owns. */
const TEMPLATE_PAYLOADS: Record<string, PayloadKind[]> = {
  weekly_review: ["weekly_review"],
  monthly_review: ["monthly_review"],
  upcoming_payment: ["upcoming_payment", "payments_digest"],
  unallocated_money: ["unallocated_money"],
  goal_contribution: ["goal_contribution"],
  wallet_below: ["low_wallet_balance"],
  account_below: ["low_account_balance"],
};

interface RunInput {
  automations: AutomationRule[];
  drafts: NotificationDraft[];
  signals: Signals;
  now?: Date;
}

export interface RunResult {
  drafts: NotificationDraft[];
  runs: AutomationRun[];
  automations: AutomationRule[];
}

/**
 * Applies the enabled/disabled state of every automation to this run's drafts
 * and records what happened for the automation log.
 */
export function runAutomations({ automations, drafts, signals, now = new Date() }: RunInput): RunResult {
  const disabledKinds = new Set<PayloadKind>();
  const runs: AutomationRun[] = [];
  const updated: AutomationRule[] = [];

  for (const automation of automations) {
    const owned = automation.templateId ? TEMPLATE_PAYLOADS[automation.templateId] ?? [] : [];
    if (!automation.enabled) {
      for (const kind of owned) disabledKinds.add(kind);
      updated.push(automation);
      continue;
    }

    const matching = drafts.filter((draft) => owned.includes(draft.payload.kind));
    const triggered = owned.length === 0 ? false : matching.length > 0;

    if (!triggered) {
      updated.push(automation);
      continue;
    }

    // A condition never turns a safe action into a silent money movement.
    const minAmount = automation.condition.minAmountMinor ?? 0;
    const passes = matching.filter((draft) => amountOf(draft) >= minAmount);
    if (!passes.length) {
      runs.push(run(automation, now, "skipped", "Condição não verificada."));
      updated.push(automation);
      continue;
    }

    const financial = FINANCIAL_ACTIONS.includes(automation.action.kind);
    runs.push(
      run(
        automation,
        now,
        financial ? "prepared" : automation.action.kind === "generate_review" ? "completed" : "notified",
        financial
          ? "Ação preparada. Aguarda confirmação."
          : automation.action.kind === "generate_review"
            ? "Resumo preparado."
            : `${passes.length} notificação(ões) enviada(s).`,
      ),
    );
    updated.push({ ...automation, lastRunAt: now.toISOString() });
  }

  // Custom automations without a template only notify, with their own wording.
  for (const automation of automations) {
    if (!automation.enabled || automation.templateId) continue;
    const draft = customDraft(automation, signals, now);
    if (draft) {
      drafts = [...drafts, draft];
      runs.push(run(automation, now, "notified", "Notificação enviada."));
    } else {
      runs.push(run(automation, now, "skipped", "Sem condições para executar."));
    }
  }

  return {
    drafts: drafts.filter((draft) => !disabledKinds.has(draft.payload.kind)),
    runs,
    automations: updated,
  };
}

function amountOf(draft: NotificationDraft): number {
  const payload = draft.payload as { amountMinor?: number; totalMinor?: number };
  return payload.amountMinor ?? payload.totalMinor ?? Number.MAX_SAFE_INTEGER;
}

function run(
  automation: AutomationRule,
  now: Date,
  outcome: AutomationRun["outcome"],
  detail: string,
): AutomationRun {
  return {
    id: newId(),
    automationId: automation.id,
    automationName: automation.name,
    at: now.toISOString(),
    outcome,
    detail,
    attempts: 1,
  };
}

/** Minimal custom builder: WHEN an event happens, IF above an amount, THEN notify. */
function customDraft(automation: AutomationRule, signals: Signals, now: Date): NotificationDraft | null {
  const min = automation.condition.minAmountMinor ?? 0;

  if (automation.trigger.kind === "wallet_below_threshold") {
    const wallet = signals.lowWallets.find((w) => w.id === automation.trigger.walletId);
    if (!wallet) return null;
    return {
      dedupeKey: `automation:${automation.id}:${localDateKey(now)}`,
      category: "organization",
      prefKey: "low_balance",
      priority: "high",
      title: automation.action.message || `A carteira ${wallet.name} está abaixo do limite que definiste.`,
      body: "",
      payload: {
        kind: "low_wallet_balance",
        walletId: wallet.id,
        name: wallet.name,
        balanceMinor: wallet.balanceMinor,
        thresholdMinor: wallet.thresholdMinor,
      },
      to: `/app/wallets/${wallet.id}`,
      actions: ["view"],
    };
  }

  if (automation.trigger.kind === "unallocated_money" && signals.unallocatedMinor >= min) {
    return {
      dedupeKey: `automation:${automation.id}:${localDateKey(now)}`,
      category: "organization",
      prefKey: "unallocated_money",
      priority: "low",
      title: automation.action.message || "Tens dinheiro por distribuir.",
      body: "",
      payload: { kind: "unallocated_money", amountMinor: signals.unallocatedMinor },
      to: "/app/money-map",
      actions: ["distribute", "view"],
    };
  }

  if (automation.trigger.kind === "schedule_monthly" && now.getDate() === (automation.trigger.day ?? 1)) {
    return {
      dedupeKey: `automation:${automation.id}:${localMonthKey(now)}`,
      category: "system",
      prefKey: "system",
      priority: "low",
      title: automation.action.message || automation.name,
      body: "",
      payload: { kind: "system", message: automation.action.message || automation.name },
      to: "/app/automations",
      actions: ["view"],
    };
  }

  return null;
}

/** Retry a failed run once, without ever repeating a financial action. */
export function retryRun(runs: AutomationRun[], id: string, now = new Date()): AutomationRun[] {
  return runs.map((entry) =>
    entry.id === id && entry.outcome === "failed"
      ? { ...entry, attempts: entry.attempts + 1, at: now.toISOString(), detail: "Nova tentativa em curso." }
      : entry,
  );
}
