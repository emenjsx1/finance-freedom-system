import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAnalyticsInput } from "@/hooks/use-analytics";
import { newId, useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { buildDrafts } from "@/lib/notifications/rules";
import { personalDrafts } from "@/lib/notifications/personal-rules";
import {
  EMPTY_NOTIFICATIONS_STATE,
  dismiss as dismissNotification,
  ingest,
  markActed,
  markAllRead as markAllReadState,
  markRead as markReadState,
  registerDevice,
  removeDevice,
  snooze as snoozeState,
  unreadCount as countUnread,
  visibleNotifications,
  type NotificationsState,
} from "@/lib/notifications/service";
import type { AppNotification, NotificationPrefs } from "@/lib/notifications/types";
import { runAutomations } from "@/lib/automations/engine";
import type { AutomationRule, AutomationRun } from "@/lib/automations/types";
import { loadNotifications, saveNotifications } from "@/lib/storage/notifications-store";
import type { Transaction } from "@/lib/finance/ledger-types";

/** A money movement an automation or notification proposed. Never executed on its own. */
export interface PreparedMovement {
  id: string;
  source: "notification" | "automation";
  notificationId?: string;
  kind: "expense" | "reallocation";
  title: string;
  amountMinor: number;
  recurringId?: string;
  categoryId?: string | undefined;
  accountId?: string | undefined;
  bucketId?: string | undefined;
  fromBucketId?: string | undefined;
  toBucketId?: string | undefined;
  summary: string;
}

export type PushStatus = "unsupported" | "open-in-new-tab" | "denied" | "registered" | "idle";

interface NotificationsContextValue {
  state: NotificationsState;
  hydrated: boolean;
  visible: AppNotification[];
  unread: number;
  prepared: PreparedMovement | null;
  refresh: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  snooze: (id: string, until: Date) => void;
  act: (notification: AppNotification, action: string) => void;
  confirmPrepared: () => void;
  cancelPrepared: () => void;
  updatePrefs: (patch: Partial<NotificationPrefs>) => void;
  upsertAutomation: (rule: AutomationRule) => void;
  deleteAutomation: (id: string) => void;
  retryAutomation: (runId: string) => void;
  enablePush: () => Promise<PushStatus>;
  forgetDevice: (id: string) => void;
  recordSecurityEvent: (event: "new_login" | "password_changed" | "settings_changed" | "new_device", detail?: string) => void;
}

const Ctx = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const input = useAnalyticsInput();
  const { state: personal, updateAction } = usePersonal();
  const { addTransaction, upsertRecurring, ledger } = useLedger();
  const [state, setState] = useState<NotificationsState>(EMPTY_NOTIFICATIONS_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [prepared, setPrepared] = useState<PreparedMovement | null>(null);
  const [tick, setTick] = useState(0);
  const inputRef = useRef(input);
  inputRef.current = input;
  const developmentRef = useRef(personal.development);
  developmentRef.current = personal.development;

  useEffect(() => {
    setState(loadNotifications());
    setHydrated(true);
  }, []);

  const commit = useCallback((updater: (prev: NotificationsState) => NotificationsState) => {
    setState((prev) => {
      const next = updater(prev);
      saveNotifications(next);
      return next;
    });
  }, []);

  /**
   * One scheduler pass. Deterministic: the same moment and the same data
   * always produce the same dedupe keys, so a retry creates nothing new.
   */
  const refresh = useCallback(() => {
    const now = new Date();
    commit((prev) => {
      const { drafts: financial, signals } = buildDrafts(inputRef.current, prev.prefs, prev.cooldowns, now);
      const drafts = [...financial, ...personalDrafts(developmentRef.current, now)];
      const result = runAutomations({ automations: prev.automations, drafts, signals, now });
      const ingested = ingest({ ...prev, automations: result.automations }, result.drafts, now);
      const runs = result.runs.length ? [...result.runs, ...ingested.state.runs].slice(0, 100) : ingested.state.runs;
      return { ...ingested.state, runs };
    });
  }, [commit]);

  // Runs when the app opens, whenever money changes, and on a light interval.
  useEffect(() => {
    if (!hydrated) return;
    refresh();
  }, [hydrated, refresh, ledger.transactions, ledger.recurring, personal.development, tick]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const visible = useMemo(() => visibleNotifications(state, new Date(Date.now())), [state, tick]);
  const unread = useMemo(() => countUnread(state, new Date(Date.now())), [state, tick]);

  const markRead = useCallback((id: string) => commit((prev) => markReadState(prev, id)), [commit]);
  const markAllRead = useCallback(() => commit(markAllReadState), [commit]);
  const dismiss = useCallback((id: string) => commit((prev) => dismissNotification(prev, id)), [commit]);
  const snooze = useCallback(
    (id: string, until: Date) => commit((prev) => snoozeState(prev, id, until)),
    [commit],
  );

  /** Turns an actionable notification into a PREPARED movement. Never money. */
  const act = useCallback(
    (notification: AppNotification, action: string) => {
      if (action === "mark_paid" && notification.payload.kind === "upcoming_payment") {
        const payload = notification.payload;
        const found = inputRef.current.recurring.find((r) => r.id === payload.recurringId);
        setPrepared({
          id: newId(),
          source: "notification",
          notificationId: notification.id,
          kind: "expense",
          title: payload.name,
          amountMinor: payload.amountMinor,
          recurringId: payload.recurringId,
          categoryId: found?.categoryId,
          accountId: found?.accountId,
          bucketId: found?.bucketId,
          summary: `Pagamento de ${payload.name}. Nada é registado até confirmares.`,
        });
        return;
      }
      if (action === "contribute" && (notification.payload.kind === "goal_contribution" || notification.payload.kind === "goal_deadline")) {
        const payload = notification.payload;
        const amountMinor = payload.kind === "goal_contribution" ? payload.amountMinor : Math.max(payload.targetMinor - payload.savedMinor, 0);
        const free = inputRef.current.setup.ruleItems.find((item) => item.kind === "free" && !item.archived);
        setPrepared({
          id: newId(),
          source: "notification",
          notificationId: notification.id,
          kind: "reallocation",
          title: payload.name,
          amountMinor,
          fromBucketId: free?.id,
          toBucketId: payload.walletId,
          summary: `Contribuição para ${payload.name}. Nada muda até confirmares.`,
        });
        return;
      }
      /* Personal actions carry no money, so they complete directly. */
      if (action === "complete_action" && notification.payload.kind === "personal_action") {
        updateAction(notification.payload.actionId, {
          status: "done",
          completedAt: new Date().toISOString(),
        });
        commit((prev) => markActed(prev, notification.id));
        return;
      }
      if (action === "skip_contribution") {
        commit((prev) => markActed(prev, notification.id));
        return;
      }
      commit((prev) => markActed(prev, notification.id));
    },
    [commit, updateAction],
  );

  const confirmPrepared = useCallback(() => {
    if (!prepared) return;
    const now = new Date().toISOString();
    const tx: Transaction = {
      id: newId(),
      kind: prepared.kind,
      amountMinor: prepared.amountMinor,
      occurredAt: now,
      createdAt: now,
      moneyType: "personal",
      tags: [],
      attachments: [],
      description: prepared.title,
      ...(prepared.recurringId ? { recurringId: prepared.recurringId } : {}),
      ...(prepared.categoryId ? { categoryId: prepared.categoryId } : {}),
      ...(prepared.accountId ? { accountId: prepared.accountId } : {}),
      ...(prepared.bucketId ? { bucketId: prepared.bucketId } : {}),
      ...(prepared.fromBucketId ? { fromBucketId: prepared.fromBucketId } : {}),
      ...(prepared.toBucketId ? { toBucketId: prepared.toBucketId } : {}),
    };
    addTransaction(tx);
    if (prepared.recurringId) {
      const rule = inputRef.current.recurring.find((r) => r.id === prepared.recurringId);
      if (rule) upsertRecurring({ ...rule, lastHandledAt: now });
    }
    if (prepared.notificationId) {
      const id = prepared.notificationId;
      commit((prev) => markActed(prev, id));
    }
    setPrepared(null);
  }, [prepared, addTransaction, upsertRecurring, commit]);

  const cancelPrepared = useCallback(() => setPrepared(null), []);

  const updatePrefs = useCallback(
    (patch: Partial<NotificationPrefs>) => commit((prev) => ({ ...prev, prefs: { ...prev.prefs, ...patch } })),
    [commit],
  );

  const upsertAutomation = useCallback(
    (rule: AutomationRule) =>
      commit((prev) => ({
        ...prev,
        automations: prev.automations.some((a) => a.id === rule.id)
          ? prev.automations.map((a) => (a.id === rule.id ? rule : a))
          : [...prev.automations, rule],
      })),
    [commit],
  );

  const deleteAutomation = useCallback(
    (id: string) => commit((prev) => ({ ...prev, automations: prev.automations.filter((a) => a.id !== id) })),
    [commit],
  );

  const retryAutomation = useCallback(
    (runId: string) => {
      commit((prev) => ({
        ...prev,
        runs: prev.runs.map((r): AutomationRun => (r.id === runId ? { ...r, attempts: r.attempts + 1, outcome: "completed", detail: "Concluída na nova tentativa." } : r)),
      }));
      refresh();
    },
    [commit, refresh],
  );

  /** Web push registration. Architecture is platform-agnostic; web is the adapter that exists today. */
  const enablePush = useCallback(async (): Promise<PushStatus> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    if (window.top !== window.self) return "open-in-new-tab";
    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") return "denied";
    commit((prev) =>
      registerDevice(prev, {
        platform: "web",
        token: `web-${newId()}`,
        enabled: true,
        label: navigator.userAgent.slice(0, 60),
      }),
    );
    return "registered";
  }, [commit]);

  const forgetDevice = useCallback((id: string) => commit((prev) => removeDevice(prev, id)), [commit]);

  const recordSecurityEvent = useCallback(
    (event: "new_login" | "password_changed" | "settings_changed" | "new_device", detail?: string) => {
      const now = new Date();
      commit((prev) =>
        ingest(
          prev,
          [
            {
              dedupeKey: `security:${event}:${now.toISOString()}`,
              category: "system",
              prefKey: "security",
              priority: "security",
              title:
                event === "new_login"
                  ? "Nova sessão iniciada."
                  : event === "password_changed"
                    ? "Palavra-passe alterada."
                    : event === "new_device"
                      ? "Novo dispositivo associado."
                      : "Definições sensíveis alteradas.",
              body: detail ?? "Se não foste tu, revê a tua conta.",
              payload: { kind: "security", event, ...(detail ? { detail } : {}) },
              to: "/app/settings",
              actions: ["view"],
            },
          ],
          now,
        ).state,
      );
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      state,
      hydrated,
      visible,
      unread,
      prepared,
      refresh,
      markRead,
      markAllRead,
      dismiss,
      snooze,
      act,
      confirmPrepared,
      cancelPrepared,
      updatePrefs,
      upsertAutomation,
      deleteAutomation,
      retryAutomation,
      enablePush,
      forgetDevice,
      recordSecurityEvent,
    }),
    [
      state,
      hydrated,
      visible,
      unread,
      prepared,
      refresh,
      markRead,
      markAllRead,
      dismiss,
      snooze,
      act,
      confirmPrepared,
      cancelPrepared,
      updatePrefs,
      upsertAutomation,
      deleteAutomation,
      retryAutomation,
      enablePush,
      forgetDevice,
      recordSecurityEvent,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
