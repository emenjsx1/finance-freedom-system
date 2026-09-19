/**
 * Personal OS state: direction, plans, strategy, context and commitments.
 *
 * Money never lives here. Plans point at the purpose wallet that holds the
 * reserved amount, and every balance still comes from the financial engine.
 */
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

import { useSetup } from "@/hooks/use-setup";
import { templateByKey, type StrategyTemplate } from "@/lib/personal/strategies";
import {
  EMPTY_PERSONAL_STATE,
  type AgentPermissions,
  type Commitment,
  type DirectionItem,
  type PersonalContextItem,
  type PersonalState,
  type Plan,
  type Strategy,
  type StrategyRule,
} from "@/lib/personal/types";
import { loadPersonal, savePersonal } from "@/lib/storage/personal-store";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

const now = () => new Date().toISOString();

interface PersonalContextValue {
  state: PersonalState;
  hydrated: boolean;
  setHeadline: (value: string) => void;
  addDirection: (item: Omit<DirectionItem, "id" | "createdAt">) => void;
  removeDirection: (id: string) => void;
  createPlan: (
    input: Omit<Plan, "id" | "createdAt" | "updatedAt" | "milestones"> & { milestones?: Plan["milestones"] },
  ) => Plan;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  removePlan: (id: string) => void;
  toggleMilestone: (planId: string, milestoneId: string) => void;
  addMilestone: (planId: string, title: string) => void;
  applyTemplate: (template: StrategyTemplate) => void;
  updateStrategy: (patch: Partial<Strategy>) => void;
  upsertRule: (rule: StrategyRule) => void;
  removeRule: (ruleId: string) => void;
  clearStrategy: () => void;
  addContext: (item: Omit<PersonalContextItem, "id" | "createdAt" | "updatedAt" | "state">) => void;
  updateContext: (id: string, patch: Partial<PersonalContextItem>) => void;
  removeContext: (id: string) => void;
  addCommitment: (item: Omit<Commitment, "id" | "createdAt">) => void;
  removeCommitment: (id: string) => void;
  setPermissions: (patch: Partial<AgentPermissions>) => void;
}

const Ctx = createContext<PersonalContextValue | null>(null);

export function PersonalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersonalState>(EMPTY_PERSONAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const { setup } = useSetup();
  const migrated = useRef(false);

  useEffect(() => {
    setState(loadPersonal());
    setHydrated(true);
  }, []);

  const commit = useCallback((updater: (prev: PersonalState) => PersonalState) => {
    setState((prev) => {
      const next = updater(prev);
      savePersonal(next);
      return next;
    });
  }, []);

  /**
   * Legacy migration: an older version organised money with a fixed
   * 40/20/20/10/10 rule. The historical wallets and their money stay exactly as
   * they are; the percentages become an editable "previous strategy" that only
   * suggests, so nothing is assumed to still be the person's intent.
   */
  useEffect(() => {
    if (!hydrated || migrated.current) return;
    if (state.strategy || state.legacyMigratedAt) return;
    const items = setup.ruleItems.filter((item) => !item.archived && item.percentage > 0);
    if (items.length === 0) return;
    migrated.current = true;

    const strategy: Strategy = {
      id: newId(),
      templateKey: "legacy",
      name: "Minha estratégia anterior",
      description:
        "Convertida a partir da organização fixa que usavas antes. Podes manter, editar ou desligar.",
      mode: "suggest",
      rules: items.map((item, index) => ({
        id: newId(),
        label: item.name,
        method: "percentage" as const,
        value: item.percentage,
        targetKind: "wallet" as const,
        targetId: item.id,
        order: index,
        enabled: true,
      })),
      createdAt: now(),
      updatedAt: now(),
    };

    commit((prev) => ({ ...prev, strategy, legacyMigratedAt: now() }));
  }, [hydrated, state.strategy, state.legacyMigratedAt, setup.ruleItems, commit]);

  const setHeadline = useCallback(
    (value: string) => commit((prev) => ({ ...prev, headline: value.trim() || undefined })),
    [commit],
  );

  const addDirection = useCallback<PersonalContextValue["addDirection"]>(
    (item) =>
      commit((prev) => ({
        ...prev,
        direction: [...prev.direction, { ...item, id: newId(), createdAt: now() }],
      })),
    [commit],
  );

  const removeDirection = useCallback(
    (id: string) => commit((prev) => ({ ...prev, direction: prev.direction.filter((d) => d.id !== id) })),
    [commit],
  );

  const createPlan = useCallback<PersonalContextValue["createPlan"]>(
    (input) => {
      const plan: Plan = {
        ...input,
        milestones: input.milestones ?? [],
        id: newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      commit((prev) => ({ ...prev, plans: [plan, ...prev.plans] }));
      return plan;
    },
    [commit],
  );

  const updatePlan = useCallback(
    (id: string, patch: Partial<Plan>) =>
      commit((prev) => ({
        ...prev,
        plans: prev.plans.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)),
      })),
    [commit],
  );

  /** Archiving is the normal path; deleting never touches financial history. */
  const removePlan = useCallback(
    (id: string) => commit((prev) => ({ ...prev, plans: prev.plans.filter((p) => p.id !== id) })),
    [commit],
  );

  const toggleMilestone = useCallback(
    (planId: string, milestoneId: string) =>
      commit((prev) => ({
        ...prev,
        plans: prev.plans.map((p) =>
          p.id !== planId
            ? p
            : {
                ...p,
                updatedAt: now(),
                milestones: p.milestones.map((m) =>
                  m.id === milestoneId
                    ? { ...m, done: !m.done, doneAt: !m.done ? now() : undefined }
                    : m,
                ),
              },
        ),
      })),
    [commit],
  );

  const addMilestone = useCallback(
    (planId: string, title: string) =>
      commit((prev) => ({
        ...prev,
        plans: prev.plans.map((p) =>
          p.id !== planId
            ? p
            : {
                ...p,
                updatedAt: now(),
                milestones: [...p.milestones, { id: newId(), title, done: false }],
              },
        ),
      })),
    [commit],
  );

  const applyTemplate = useCallback<PersonalContextValue["applyTemplate"]>(
    (template) =>
      commit((prev) => ({
        ...prev,
        strategy: {
          id: prev.strategy?.id ?? newId(),
          templateKey: template.key,
          name: template.name,
          description: template.philosophy,
          mode: template.defaultMode,
          ...(template.keepAvailableMinor !== undefined
            ? { keepAvailableMinor: template.keepAvailableMinor }
            : {}),
          rules: template.rules.map((rule, index) => ({
            id: newId(),
            label: rule.label,
            method: rule.method,
            value: rule.value,
            targetKind: rule.targetKind,
            ...(rule.untilMinor !== undefined ? { untilMinor: rule.untilMinor } : {}),
            order: index,
            enabled: true,
          })),
          createdAt: prev.strategy?.createdAt ?? now(),
          updatedAt: now(),
        },
      })),
    [commit],
  );

  const updateStrategy = useCallback(
    (patch: Partial<Strategy>) =>
      commit((prev) =>
        prev.strategy
          ? { ...prev, strategy: { ...prev.strategy, ...patch, updatedAt: now() } }
          : prev,
      ),
    [commit],
  );

  const upsertRule = useCallback(
    (rule: StrategyRule) =>
      commit((prev) => {
        if (!prev.strategy) return prev;
        const exists = prev.strategy.rules.some((r) => r.id === rule.id);
        const rules = exists
          ? prev.strategy.rules.map((r) => (r.id === rule.id ? rule : r))
          : [...prev.strategy.rules, rule];
        return { ...prev, strategy: { ...prev.strategy, rules, updatedAt: now() } };
      }),
    [commit],
  );

  const removeRule = useCallback(
    (ruleId: string) =>
      commit((prev) =>
        prev.strategy
          ? {
              ...prev,
              strategy: {
                ...prev.strategy,
                rules: prev.strategy.rules.filter((r) => r.id !== ruleId),
                updatedAt: now(),
              },
            }
          : prev,
      ),
    [commit],
  );

  /** Changing or removing a strategy only affects future money. */
  const clearStrategy = useCallback(() => commit((prev) => ({ ...prev, strategy: null })), [commit]);

  const addContext = useCallback<PersonalContextValue["addContext"]>(
    (item) =>
      commit((prev) => ({
        ...prev,
        context: [
          { ...item, id: newId(), state: "active", createdAt: now(), updatedAt: now() },
          ...prev.context,
        ],
      })),
    [commit],
  );

  const updateContext = useCallback(
    (id: string, patch: Partial<PersonalContextItem>) =>
      commit((prev) => ({
        ...prev,
        context: prev.context.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c)),
      })),
    [commit],
  );

  /** Deleting removes the record, it does not hide it. */
  const removeContext = useCallback(
    (id: string) => commit((prev) => ({ ...prev, context: prev.context.filter((c) => c.id !== id) })),
    [commit],
  );

  const addCommitment = useCallback<PersonalContextValue["addCommitment"]>(
    (item) =>
      commit((prev) => ({
        ...prev,
        commitments: [...prev.commitments, { ...item, id: newId(), createdAt: now() }],
      })),
    [commit],
  );

  const removeCommitment = useCallback(
    (id: string) =>
      commit((prev) => ({ ...prev, commitments: prev.commitments.filter((c) => c.id !== id) })),
    [commit],
  );

  const setPermissions = useCallback(
    (patch: Partial<AgentPermissions>) =>
      commit((prev) => ({ ...prev, permissions: { ...prev.permissions, ...patch } })),
    [commit],
  );

  const value = useMemo<PersonalContextValue>(
    () => ({
      state,
      hydrated,
      setHeadline,
      addDirection,
      removeDirection,
      createPlan,
      updatePlan,
      removePlan,
      toggleMilestone,
      addMilestone,
      applyTemplate,
      updateStrategy,
      upsertRule,
      removeRule,
      clearStrategy,
      addContext,
      updateContext,
      removeContext,
      addCommitment,
      removeCommitment,
      setPermissions,
    }),
    [
      state,
      hydrated,
      setHeadline,
      addDirection,
      removeDirection,
      createPlan,
      updatePlan,
      removePlan,
      toggleMilestone,
      addMilestone,
      applyTemplate,
      updateStrategy,
      upsertRule,
      removeRule,
      clearStrategy,
      addContext,
      updateContext,
      removeContext,
      addCommitment,
      removeCommitment,
      setPermissions,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePersonal(): PersonalContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePersonal must be used inside PersonalProvider");
  return ctx;
}

export function planTemplate(key: string): StrategyTemplate | undefined {
  return templateByKey(key);
}
