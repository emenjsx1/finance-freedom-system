/**
 * Notification rules.
 *
 * Application logic — not a language model — decides whether an event
 * deserves to be communicated. Every draft here comes from a deterministic
 * signal and carries a stable `dedupeKey`, so a retried run can never create
 * the same notification twice.
 */
import { formatMoney } from "@/lib/finance/currency";
import { previousPeriod, resolvePeriod, type Period } from "@/lib/analytics/periods";
import type { AnalyticsInput } from "@/lib/analytics/service";
import { collectSignals, monthlyFacts, weeklyFacts, SIGNAL_THRESHOLDS, type Signals } from "./signals";
import {
  type BriefLine,
  type NotificationDraft,
  type NotificationPrefs,
} from "./types";
import { atLocalTime, dayLabel, localDateKey, localMonthKey } from "./time";

export interface CooldownState {
  [key: string]: { at: string; value?: number };
}

function money(minor: number, currency: string): string {
  return formatMoney(minor, currency);
}

/** Drafts for events that already happened or are about to. */
export function eventDrafts(signals: Signals, cooldowns: CooldownState, now = new Date()): NotificationDraft[] {
  const out: NotificationDraft[] = [];
  const c = signals.currencyCode;

  /* Upcoming payments — grouped when there are several. */
  if (signals.upcoming.length >= SIGNAL_THRESHOLDS.groupFrom) {
    const total = signals.upcoming.reduce((s, p) => s + p.amountMinor, 0);
    out.push({
      dedupeKey: `payments_digest:${localDateKey(now)}`,
      category: "upcoming",
      prefKey: "upcoming_payments",
      priority: "normal",
      title: `${signals.upcoming.length} pagamentos nos próximos dias`,
      body: `Total de ${money(total, c)}.`,
      payload: { kind: "payments_digest", count: signals.upcoming.length, totalMinor: total, ids: signals.upcoming.map((p) => p.id) },
      to: "/app/recurring",
      actions: ["view"],
      groupKey: "upcoming",
    });
  } else {
    for (const payment of signals.upcoming) {
      out.push({
        dedupeKey: `upcoming:${payment.id}:${localDateKey(new Date(payment.dueISO))}`,
        category: "upcoming",
        prefKey: "upcoming_payments",
        priority: "normal",
        title: `${payment.name} vence ${dayLabel(payment.dueISO, now)}`,
        body: money(payment.amountMinor, c),
        payload: {
          kind: "upcoming_payment",
          recurringId: payment.id,
          name: payment.name,
          amountMinor: payment.amountMinor,
          dueISO: payment.dueISO,
          overdue: false,
        },
        to: "/app/recurring",
        actions: ["mark_paid", "remind_later", "view"],
        groupKey: "upcoming",
      });
    }
  }

  /* Payments past their date. Factual wording — never "dívida". */
  for (const payment of signals.overdue) {
    out.push({
      dedupeKey: `overdue:${payment.id}:${localDateKey(new Date(payment.dueISO))}`,
      category: "upcoming",
      prefKey: "transaction_reminders",
      priority: "normal",
      title: `Pagamento pendente: ${payment.name}`,
      body: `${money(payment.amountMinor, c)} · previsto ${dayLabel(payment.dueISO, now)}.`,
      payload: {
        kind: "upcoming_payment",
        recurringId: payment.id,
        name: payment.name,
        amountMinor: payment.amountMinor,
        dueISO: payment.dueISO,
        overdue: true,
      },
      to: "/app/recurring",
      actions: ["mark_paid", "remind_later", "view"],
    });
  }

  /* Goals: milestones, funded, deadlines, planned contributions. */
  for (const goal of signals.goals) {
    if (goal.percent !== null && goal.targetMinor) {
      const reached = SIGNAL_THRESHOLDS.goalMilestones.filter((m) => goal.percent! >= m);
      const milestone = reached[reached.length - 1];
      if (milestone === 100) {
        out.push({
          dedupeKey: `goal_funded:${goal.id}`,
          category: "goals",
          prefKey: "goal_milestones",
          priority: "normal",
          title: "Objetivo financiado.",
          body: `${goal.name} · ${money(goal.balanceMinor, c)} / ${money(goal.targetMinor, c)}`,
          payload: { kind: "goal_funded", walletId: goal.id, name: goal.name, savedMinor: goal.balanceMinor, targetMinor: goal.targetMinor },
          to: `/app/wallets/${goal.id}`,
          actions: ["view"],
        });
      } else if (milestone) {
        out.push({
          dedupeKey: `goal_milestone:${goal.id}:${milestone}`,
          category: "goals",
          prefKey: "goal_milestones",
          priority: "low",
          title: `${goal.name} chegou a ${milestone}%.`,
          body: `${money(goal.balanceMinor, c)} de ${money(goal.targetMinor, c)}.`,
          payload: { kind: "goal_milestone", walletId: goal.id, name: goal.name, percent: milestone },
          to: `/app/wallets/${goal.id}`,
          actions: ["view"],
        });
      }
    }

    if (goal.deadlineDays !== null && goal.deadlineDays >= 0 && goal.targetMinor) {
      const step = SIGNAL_THRESHOLDS.goalDeadlineDays.find((d) => goal.deadlineDays! <= d);
      if (step) {
        out.push({
          dedupeKey: `goal_deadline:${goal.id}:${step}`,
          category: "goals",
          prefKey: "goal_deadlines",
          priority: "normal",
          title: `Faltam ${goal.deadlineDays} dias para a data definida para ${goal.name}.`,
          body: `Reunido ${money(goal.balanceMinor, c)} · Alvo ${money(goal.targetMinor, c)} · Falta ${money(goal.remainingMinor ?? 0, c)}.`,
          payload: {
            kind: "goal_deadline",
            walletId: goal.id,
            name: goal.name,
            days: goal.deadlineDays,
            savedMinor: goal.balanceMinor,
            targetMinor: goal.targetMinor,
          },
          to: `/app/wallets/${goal.id}`,
          actions: ["contribute", "view"],
        });
      }
    }

    if (goal.monthlyPlanMinor && goal.contributedThisMonthMinor < goal.monthlyPlanMinor) {
      out.push({
        dedupeKey: `goal_contribution:${goal.id}:${localMonthKey(now)}`,
        category: "goals",
        prefKey: "goal_reminders",
        priority: "low",
        title: `Planeaste adicionar ${money(goal.monthlyPlanMinor, c)} a ${goal.name} este mês.`,
        body:
          goal.contributedThisMonthMinor > 0
            ? `Já contribuíste ${money(goal.contributedThisMonthMinor, c)}.`
            : "Ainda não registaste contribuição este mês.",
        payload: { kind: "goal_contribution", walletId: goal.id, name: goal.name, amountMinor: goal.monthlyPlanMinor },
        to: `/app/wallets/${goal.id}`,
        actions: ["contribute", "remind_later", "skip_contribution"],
      });
    }
  }

  /* Unallocated money, with cooldown so it never becomes daily noise. */
  const unallocated = signals.unallocatedMinor;
  const incomeThisMonth = signals.monthSummary.incomeMinor;
  const meaningful =
    unallocated >= SIGNAL_THRESHOLDS.minAmountMinor &&
    (incomeThisMonth === 0 || unallocated >= incomeThisMonth * SIGNAL_THRESHOLDS.unallocatedShare);
  if (meaningful) {
    const last = cooldowns["unallocated"];
    const daysSince = last ? (now.getTime() - new Date(last.at).getTime()) / 86_400_000 : Infinity;
    const changed =
      !last?.value || Math.abs(unallocated - last.value) / Math.max(last.value, 1) >= SIGNAL_THRESHOLDS.unallocatedChangeShare;
    if (daysSince >= SIGNAL_THRESHOLDS.unallocatedCooldownDays || changed) {
      out.push({
        dedupeKey: `unallocated:${localDateKey(now)}:${unallocated}`,
        category: "organization",
        prefKey: "unallocated_money",
        priority: "low",
        title: `${money(unallocated, c)} ainda não têm um propósito.`,
        body: "Podes distribuir este dinheiro pelas tuas carteiras.",
        payload: { kind: "unallocated_money", amountMinor: unallocated },
        to: "/app/money-map",
        actions: ["distribute", "view"],
      });
    }
  }

  /* Protected money — informational, never judgemental. */
  for (const item of signals.protectedWithdrawals) {
    out.push({
      dedupeKey: `protected:${item.transaction.id}`,
      category: "protected",
      prefKey: "protected_money",
      priority: "normal",
      title: `Retiraste ${money(item.transaction.amountMinor, c)} de ${item.walletName}.`,
      body: item.transaction.protectedReason ? `Motivo: ${item.transaction.protectedReason}` : "Registado no histórico do dinheiro protegido.",
      payload: {
        kind: "protected_withdrawal",
        transactionId: item.transaction.id,
        walletId: item.transaction.fromBucketId ?? item.transaction.bucketId ?? "",
        amountMinor: item.transaction.amountMinor,
        ...(item.transaction.protectedReason ? { reason: item.transaction.protectedReason } : {}),
      },
      to: "/app/protected",
      actions: ["view"],
    });
  }

  /* Large expense — confirmation and context, not criticism. */
  for (const item of signals.largeExpenses) {
    const parts = [item.categoryName, item.accountName, item.walletName].filter(Boolean).join(" · ");
    out.push({
      dedupeKey: `large_expense:${item.transaction.id}`,
      category: "transactions",
      prefKey: "large_expense",
      priority: "low",
      title: `Registaste uma despesa de ${money(item.transaction.amountMinor, c)}.`,
      body: parts || "Sem categoria atribuída.",
      payload: {
        kind: "large_expense",
        transactionId: item.transaction.id,
        amountMinor: item.transaction.amountMinor,
        ...(item.categoryName ? { categoryName: item.categoryName } : {}),
        ...(item.accountName ? { accountName: item.accountName } : {}),
        ...(item.walletName ? { walletName: item.walletName } : {}),
      },
      to: "/app/activity",
      actions: ["view"],
    });
  }

  /* User-defined thresholds only. The app never invents a "low" amount. */
  for (const wallet of signals.lowWallets) {
    out.push({
      dedupeKey: `low_wallet:${wallet.id}:${localDateKey(now)}`,
      category: "organization",
      prefKey: "low_balance",
      priority: "high",
      title: `A carteira ${wallet.name} está abaixo do limite que definiste.`,
      body: `${money(wallet.balanceMinor, c)} · limite ${money(wallet.thresholdMinor, c)}.`,
      payload: { kind: "low_wallet_balance", walletId: wallet.id, name: wallet.name, balanceMinor: wallet.balanceMinor, thresholdMinor: wallet.thresholdMinor },
      to: `/app/wallets/${wallet.id}`,
      actions: ["view"],
    });
  }
  for (const account of signals.lowAccounts) {
    out.push({
      dedupeKey: `low_account:${account.id}:${localDateKey(now)}`,
      category: "organization",
      prefKey: "low_balance",
      priority: "high",
      title: `${account.name} está abaixo do limite definido.`,
      body: `${money(account.balanceMinor, c)} · limite ${money(account.thresholdMinor, c)}.`,
      payload: { kind: "low_account_balance", accountId: account.id, name: account.name, balanceMinor: account.balanceMinor, thresholdMinor: account.thresholdMinor },
      to: `/app/accounts/${account.id}`,
      actions: ["view"],
    });
  }

  /* Available money reached zero — a fact, never a judgement. */
  if (signals.unallocatedMinor <= 0 && signals.monthSummary.expensesMinor > 0) {
    out.push({
      dedupeKey: `available_zero:${localDateKey(now)}`,
      category: "organization",
      prefKey: "low_balance",
      priority: "high",
      title: "O teu disponível chegou a zero.",
      body: "Todo o dinheiro que tens já está reservado para algum propósito.",
      payload: { kind: "available_zero", availableMinor: 0, plannedMinor: 0 },
      to: "/app/planning",
      actions: ["view"],
    });
  }

  /* Deterministic insights from the Phase 07 engine. */
  for (const insight of signals.insights) {
    out.push({
      dedupeKey: `insight:${insight.id}:${localMonthKey(now)}`,
      category: "agent",
      prefKey: insight.kind === "category_change" ? "category_insights" : "agent_insights",
      priority: "low",
      title: insight.title,
      body: insight.detail ?? "",
      payload: { kind: "insight", insightId: insight.id, ...(insight.detail ? { detail: insight.detail } : {}) },
      to: insight.to ?? "/app/analytics",
      actions: ["view", "ask_agent"],
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Scheduled reviews                                                   */
/* ------------------------------------------------------------------ */

export function briefLines(signals: Signals, prefs: NotificationPrefs): BriefLine[] {
  const c = signals.currencyCode;
  const lines: BriefLine[] = [];
  for (const section of prefs.dailyBrief.sections) {
    if (section === "available") {
      lines.push({ section, label: "Disponível para gastar", value: money(signals.availableMinor, c), amountMinor: signals.availableMinor });
    }
    if (section === "upcoming") {
      const next = signals.upcoming[0] ?? signals.overdue[0];
      if (next) {
        lines.push({
          section,
          label: `Próximo pagamento · ${next.name}`,
          value: `${money(next.amountMinor, c)} · ${dayLabel(next.dueISO)}`,
          amountMinor: next.amountMinor,
        });
      }
    }
    if (section === "goals") {
      const goal = signals.goals.find((g) => g.targetMinor) ?? signals.goals[0];
      if (goal) {
        lines.push({
          section,
          label: goal.name,
          value: goal.targetMinor ? `${money(goal.balanceMinor, c)} / ${money(goal.targetMinor, c)}` : money(goal.balanceMinor, c),
          amountMinor: goal.balanceMinor,
        });
      }
    }
    if (section === "spending") {
      lines.push({
        section,
        label: "Gastos este mês",
        value: money(signals.monthSummary.expensesMinor, c),
        amountMinor: signals.monthSummary.expensesMinor,
      });
    }
    if (section === "unallocated" && signals.unallocatedMinor > 0) {
      lines.push({ section, label: "Sem propósito", value: money(signals.unallocatedMinor, c), amountMinor: signals.unallocatedMinor });
    }
  }
  return lines;
}

/**
 * Drafts for the scheduled reviews. `lastRunAt` lets a device that was closed
 * at the scheduled minute still produce the occurrence when it opens, without
 * ever duplicating it (the dedupe key is the local calendar date).
 */
export function scheduledDrafts(
  input: AnalyticsInput,
  signals: Signals,
  prefs: NotificationPrefs,
  now = new Date(),
): NotificationDraft[] {
  const out: NotificationDraft[] = [];
  const c = signals.currencyCode;

  if (prefs.dailyBrief.enabled && now >= atLocalTime(now, prefs.dailyBrief.time)) {
    const lines = briefLines(signals, prefs);
    if (lines.length) {
      out.push({
        dedupeKey: `daily_brief:${localDateKey(now)}`,
        category: "reports",
        prefKey: "daily_brief",
        priority: "low",
        title: signals.name ? `Bom dia, ${signals.name.split(" ")[0]}.` : "Resumo diário",
        body: lines.map((l) => `${l.label}: ${l.value}`).join(" · "),
        payload: { kind: "daily_brief", dateISO: now.toISOString(), lines },
        to: "/app",
        actions: ["view"],
        deliverAt: atLocalTime(now, prefs.dailyBrief.time).toISOString(),
      });
    }
  }

  if (prefs.weeklyReview.enabled && now.getDay() === (prefs.weeklyReview.weekday ?? 0)) {
    const scheduled = atLocalTime(now, prefs.weeklyReview.time);
    if (now >= scheduled) {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const period: Period = {
        key: "custom",
        label: "Esta semana",
        start,
        end: now,
        partial: true,
        daysElapsed: 7,
        totalDays: 7,
      };
      const facts = weeklyFacts(input, period);
      out.push({
        dedupeKey: `weekly_review:${localDateKey(now)}`,
        category: "reports",
        prefKey: "weekly_review",
        priority: "normal",
        title: "Resumo semanal pronto",
        body: `Entradas ${money(facts.summary.incomeMinor, c)} · Gastos ${money(facts.summary.expensesMinor, c)} · Construído ${money(facts.summary.builtMinor, c)}`,
        payload: {
          kind: "weekly_review",
          startISO: start.toISOString(),
          endISO: now.toISOString(),
          incomeMinor: facts.summary.incomeMinor,
          expensesMinor: facts.summary.expensesMinor,
          builtMinor: facts.summary.builtMinor,
          goalsMinor: facts.summary.goalsMinor,
          ...(facts.topCategory ? { topCategory: facts.topCategory.name } : {}),
          ...(signals.upcoming[0] ? { upcoming: signals.upcoming[0].name } : {}),
        },
        to: "/app/reports",
        actions: ["open_report", "ask_agent"],
        deliverAt: scheduled.toISOString(),
      });
    }
  }

  if (prefs.monthlyReview.enabled && now.getDate() === (prefs.monthlyReview.day ?? 1)) {
    const scheduled = atLocalTime(now, prefs.monthlyReview.time);
    if (now >= scheduled) {
      const period = previousPeriod(resolvePeriod("this_month", undefined, now));
      const facts = monthlyFacts(input, period);
      out.push({
        dedupeKey: `monthly_review:${localMonthKey(period.start)}`,
        category: "reports",
        prefKey: "monthly_review",
        priority: "normal",
        title: `Fecho do mês · ${facts.label}`,
        body: `Entradas ${money(facts.summary.incomeMinor, c)} · Gastos ${money(facts.summary.expensesMinor, c)} · Construído ${money(facts.summary.builtMinor, c)}`,
        payload: {
          kind: "monthly_review",
          monthLabel: facts.label,
          incomeMinor: facts.summary.incomeMinor,
          expensesMinor: facts.summary.expensesMinor,
          builtMinor: facts.summary.builtMinor,
          goalsMinor: facts.summary.goalsMinor,
          netWorthChangeMinor: facts.change.changeMinor,
        },
        to: "/app/reports",
        actions: ["open_report", "ask_agent"],
        deliverAt: scheduled.toISOString(),
      });
    }
  }

  return out;
}

/** Everything the rules layer wants to create for this moment. */
export function buildDrafts(
  input: AnalyticsInput,
  prefs: NotificationPrefs,
  cooldowns: CooldownState,
  now = new Date(),
): { drafts: NotificationDraft[]; signals: Signals } {
  const signals = collectSignals(input, now);
  return {
    signals,
    drafts: [...eventDrafts(signals, cooldowns, now), ...scheduledDrafts(input, signals, prefs, now)],
  };
}
