import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { askAgent } from "@/lib/agent/agent.functions";
import { buildAgentContext, type AgentDeps } from "@/lib/agent/context-builder";
import { usePersonal } from "@/hooks/use-personal";
import {
  EMPTY_AGENT_STATE,
  type AgentAuditEntry,
  type AgentProfile,
  type AgentState,
  type ChatMessage,
  type Conversation,
  type Memory,
  type PreparedAction,
} from "@/lib/agent/types";
import { previewAllocation } from "@/lib/finance/engine";
import { newId, useLedger } from "@/hooks/use-ledger";
import { usePrefs } from "@/hooks/use-prefs";
import { useSetup } from "@/hooks/use-setup";
import { loadAgentState, saveAgentState } from "@/lib/storage/agent-store";

interface AgentContextValue {
  state: AgentState;
  hydrated: boolean;
  deps: AgentDeps;
  sending: boolean;
  unavailable: boolean;
  createConversation: () => string;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
  send: (
    conversationId: string,
    question: string,
    images?: { mime: string; dataUrl: string }[],
  ) => Promise<void>;
  resolveAction: (conversationId: string, messageId: string, confirm: boolean) => void;
  addMemory: (memory: Omit<Memory, "id" | "createdAt">) => void;
  updateMemory: (id: string, patch: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  updateProfile: (patch: Partial<AgentProfile>) => void;
}

const AgentCtx = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const { setup } = useSetup();
  const { ledger, snapshot, addTransaction } = useLedger();
  const { state: personal } = usePersonal();
  const { prefs } = usePrefs();
  const [state, setState] = useState<AgentState>(EMPTY_AGENT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    setState(loadAgentState());
    setHydrated(true);
  }, []);

  const commit = useCallback((updater: (prev: AgentState) => AgentState) => {
    setState((prev) => {
      const next = updater(prev);
      saveAgentState(next);
      return next;
    });
  }, []);

  const deps = useMemo<AgentDeps>(
    () => ({
      setup,
      snapshot,
      transactions: ledger.transactions,
      categories: ledger.categories,
      recurring: ledger.recurring,
      memories: state.memories,
      profile: state.profile,
      personal,
    }),
    [setup, snapshot, ledger, state.memories, state.profile, personal],
  );

  const createConversation = useCallback(() => {
    const id = newId();
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id,
      title: "Nova conversa",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    commit((prev) => ({ ...prev, conversations: [conversation, ...prev.conversations] }));
    return id;
  }, [commit]);

  const renameConversation = useCallback(
    (id: string, title: string) => {
      commit((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
      }));
    },
    [commit],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        conversations: prev.conversations.filter((c) => c.id !== id),
      }));
    },
    [commit],
  );

  const appendMessage = useCallback(
    (conversationId: string, message: ChatMessage, titleFrom?: string) => {
      commit((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                title:
                  titleFrom && c.messages.length === 0
                    ? titleFrom.slice(0, 48)
                    : c.title,
                updatedAt: new Date().toISOString(),
                messages: [...c.messages, message],
              }
            : c,
        ),
      }));
    },
    [commit],
  );

  const send = useCallback(
    async (conversationId: string, question: string, images?: { mime: string; dataUrl: string }[]) => {
      const trimmed = question.trim();
      if ((!trimmed && !images?.length) || sending) return;

      const conversation = state.conversations.find((c) => c.id === conversationId);
      const history = (conversation?.messages ?? []).slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      appendMessage(
        conversationId,
        {
          id: newId(),
          role: "user",
          content: trimmed || "Enviei uma imagem.",
          createdAt: new Date().toISOString(),
        },
        trimmed || "Imagem",
      );
      setSending(true);
      setUnavailable(false);

      try {
        const result = await askAgent({
          data: {
            question: trimmed || "Analisa esta imagem e diz-me o que encontraste.",
            agentName: prefs.agentName,
            style: prefs.agentStyle,
            context: buildAgentContext(trimmed, deps),
            history,
            ...(images?.length ? { images } : {}),
          },
        });

        if (!result.ok) {
          setUnavailable(true);
          appendMessage(conversationId, {
            id: newId(),
            role: "agent",
            content: "O Agente está temporariamente indisponível.",
            createdAt: new Date().toISOString(),
            failed: true,
          });
          return;
        }

        const action = result.action ? normaliseAction(result.action) : undefined;
        const messageId = newId();
        appendMessage(conversationId, {
          id: messageId,
          role: "agent",
          content: result.reply,
          createdAt: new Date().toISOString(),
          ...(action ? { action, actionStatus: "pending" as const } : {}),
        });

        if (action) {
          const entry: AgentAuditEntry = {
            id: newId(),
            conversationId,
            createdAt: new Date().toISOString(),
            actionType: action.type,
            proposed: action,
            status: "prepared",
          };
          commit((prev) => ({ ...prev, audit: [entry, ...prev.audit] }));
        }

        if (result.memorySuggestion) {
          // Suggestions are surfaced in the UI; nothing is stored without consent.
          appendMessage(conversationId, {
            id: newId(),
            role: "agent",
            content: `Queres que eu guarde isto para futuras conversas? "${result.memorySuggestion.content}"`,
            createdAt: new Date().toISOString(),
          });
        }
      } catch {
        setUnavailable(true);
        appendMessage(conversationId, {
          id: newId(),
          role: "agent",
          content: "O Agente está temporariamente indisponível.",
          createdAt: new Date().toISOString(),
          failed: true,
        });
      } finally {
        setSending(false);
      }
    },
    [appendMessage, commit, deps, prefs.agentName, prefs.agentStyle, sending, state.conversations],
  );

  /** Confirmation is the only path to a financial mutation. */
  const resolveAction = useCallback(
    (conversationId: string, messageId: string, confirm: boolean) => {
      const conversation = state.conversations.find((c) => c.id === conversationId);
      const message = conversation?.messages.find((m) => m.id === messageId);
      const action = message?.action;
      if (!action || message?.actionStatus !== "pending") return;

      let transactionId: string | undefined;
      if (confirm && action.type !== "goal_suggestion") {
        transactionId = newId();
        addTransaction({
          id: transactionId,
          kind: action.type,
          amountMinor: action.amountMinor,
          occurredAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          moneyType: "personal",
          tags: [],
          attachments: [],
          ...(action.categoryId ? { categoryId: action.categoryId } : {}),
          ...(action.accountId ? { accountId: action.accountId } : {}),
          ...(action.bucketId ? { bucketId: action.bucketId } : {}),
          ...(action.fromAccountId ? { fromAccountId: action.fromAccountId } : {}),
          ...(action.toAccountId ? { toAccountId: action.toAccountId } : {}),
          ...(action.fromBucketId ? { fromBucketId: action.fromBucketId } : {}),
          ...(action.toBucketId ? { toBucketId: action.toBucketId } : {}),
          ...(action.merchant ? { merchant: action.merchant } : {}),
          // Income always lands in wallets through the financial rule, so the
          // physical/purpose invariant holds exactly as in the manual flow.
          ...(action.type === "income"
            ? { allocations: previewAllocation(action.amountMinor, setup.ruleItems) }
            : {}),
        });
      }

      commit((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId
                    ? { ...m, actionStatus: confirm ? ("confirmed" as const) : ("cancelled" as const) }
                    : m,
                ),
              }
            : c,
        ),
        audit: prev.audit.map((entry) =>
          entry.conversationId === conversationId && entry.status === "prepared"
            ? {
                ...entry,
                status: confirm ? ("confirmed" as const) : ("cancelled" as const),
                ...(transactionId ? { resultTransactionId: transactionId } : {}),
              }
            : entry,
        ),
      }));
    },
    [addTransaction, commit, setup.ruleItems, state.conversations],
  );

  const addMemory = useCallback(
    (memory: Omit<Memory, "id" | "createdAt">) => {
      commit((prev) => ({
        ...prev,
        memories: [{ ...memory, id: newId(), createdAt: new Date().toISOString() }, ...prev.memories],
      }));
    },
    [commit],
  );

  const updateMemory = useCallback(
    (id: string, patch: Partial<Memory>) => {
      commit((prev) => ({
        ...prev,
        memories: prev.memories.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }));
    },
    [commit],
  );

  const deleteMemory = useCallback(
    (id: string) => {
      commit((prev) => ({ ...prev, memories: prev.memories.filter((m) => m.id !== id) }));
    },
    [commit],
  );

  const updateProfile = useCallback(
    (patch: Partial<AgentProfile>) => {
      commit((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      state,
      hydrated,
      deps,
      sending,
      unavailable,
      createConversation,
      renameConversation,
      deleteConversation,
      send,
      resolveAction,
      addMemory,
      updateMemory,
      deleteMemory,
      updateProfile,
    }),
    [
      state,
      hydrated,
      deps,
      sending,
      unavailable,
      createConversation,
      renameConversation,
      deleteConversation,
      send,
      resolveAction,
      addMemory,
      updateMemory,
      deleteMemory,
      updateProfile,
    ],
  );

  return <AgentCtx.Provider value={value}>{children}</AgentCtx.Provider>;
}

/** Drops nulls coming from the model's JSON schema. */
function normaliseAction(raw: {
  type: PreparedAction["type"];
  amountMinor: number;
  summary: string;
  categoryId?: string | null;
  accountId?: string | null;
  bucketId?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  fromBucketId?: string | null;
  toBucketId?: string | null;
  merchant?: string | null;
}): PreparedAction {
  const clean = <T,>(v: T | null | undefined) => (v === null || v === undefined ? undefined : v);
  return {
    type: raw.type,
    amountMinor: Math.max(0, Math.round(raw.amountMinor)),
    summary: raw.summary,
    ...(clean(raw.categoryId) ? { categoryId: raw.categoryId as string } : {}),
    ...(clean(raw.accountId) ? { accountId: raw.accountId as string } : {}),
    ...(clean(raw.bucketId) ? { bucketId: raw.bucketId as string } : {}),
    ...(clean(raw.fromAccountId) ? { fromAccountId: raw.fromAccountId as string } : {}),
    ...(clean(raw.toAccountId) ? { toAccountId: raw.toAccountId as string } : {}),
    ...(clean(raw.fromBucketId) ? { fromBucketId: raw.fromBucketId as string } : {}),
    ...(clean(raw.toBucketId) ? { toBucketId: raw.toBucketId as string } : {}),
    ...(clean(raw.merchant) ? { merchant: raw.merchant as string } : {}),
  };
}

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentCtx);
  if (!ctx) throw new Error("useAgent must be used inside AgentProvider");
  return ctx;
}
