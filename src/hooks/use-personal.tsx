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
import type {
  ActionStatus,
  Decision,
  DevelopmentState,
  EvolutionEvent,
  PersonalAction,
  Program,
  ProgramItem,
  Reflection,
} from "@/lib/development/types";
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

  /* -------------------- personal development -------------------- */
  createProgram: (
    input: Omit<Program, "id" | "createdAt" | "updatedAt" | "items"> & {
      items: (Omit<ProgramItem, "id" | "status" | "order"> & { order?: number })[];
    },
  ) => Program;
  updateProgram: (id: string, patch: Partial<Program>) => void;
  setProgramItemStatus: (programId: string, itemId: string, status: ActionStatus) => void;
  completeProgram: (id: string) => void;
  removeProgram: (id: string) => void;
  addAction: (
    input: Omit<PersonalAction, "id" | "createdAt" | "updatedAt" | "status"> & {
      status?: ActionStatus;
    },
  ) => PersonalAction;
  updateAction: (id: string, patch: Partial<PersonalAction>) => void;
  removeAction: (id: string) => void;
  addDecision: (input: Omit<Decision, "id" | "createdAt" | "updatedAt" | "status"> & {
    status?: Decision["status"];
  }) => Decision;
  updateDecision: (id: string, patch: Partial<Decision>) => void;
  removeDecision: (id: string) => void;
  addReflection: (input: Omit<Reflection, "id" | "createdAt">) => void;
  removeReflection: (id: string) => void;
  setDailyReflection: (enabled: boolean) => void;
  logEvolution: (event: Omit<EvolutionEvent, "id" | "at"> & { at?: string }) => void;
  hideEvolution: (id: string, hidden: boolean) => void;
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
        // Real change, written by the person: it belongs in the timeline.
        development: {
          ...prev.development,
          evolution: [
            { id: newId(), kind: "direction_added" as const, title: item.content, at: now() },
            ...prev.development.evolution,
          ],
        },
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
      commit((prev) => ({
        ...prev,
        plans: [plan, ...prev.plans],
        development: {
          ...prev.development,
          evolution: [
            { id: newId(), kind: "plan_created" as const, title: plan.name, at: now() },
            ...prev.development.evolution,
          ],
        },
      }));
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

  /* ------------------------------------------------------------------ */
  /* Personal development                                                */
  /*                                                                     */
  /* Flexible by design, but the same rules apply: nothing is created    */
  /* without the person asking for it, nothing is scored, and the        */
  /* evolution timeline only records changes that really happened.       */
  /* ------------------------------------------------------------------ */

  const patchDevelopment = useCallback(
    (updater: (dev: DevelopmentState) => DevelopmentState) =>
      commit((prev) => ({ ...prev, development: updater(prev.development) })),
    [commit],
  );

  const logEvolution = useCallback<PersonalContextValue["logEvolution"]>(
    (event) =>
      patchDevelopment((dev) => ({
        ...dev,
        evolution: [{ ...event, id: newId(), at: event.at ?? now() }, ...dev.evolution].slice(0, 500),
      })),
    [patchDevelopment],
  );

  const createProgram = useCallback<PersonalContextValue["createProgram"]>(
    (input) => {
      const program: Program = {
        ...input,
        id: newId(),
        items: input.items.map((item, index) => ({
          ...item,
          id: newId(),
          status: "pending" as const,
          order: item.order ?? index,
        })),
        createdAt: now(),
        updatedAt: now(),
      };
      patchDevelopment((dev) => ({
        ...dev,
        programs: [program, ...dev.programs],
        evolution: [
          {
            id: newId(),
            kind: "program_created" as const,
            title: program.title,
            detail: `${program.durationDays} dias`,
            at: now(),
          },
          ...dev.evolution,
        ],
      }));
      return program;
    },
    [patchDevelopment],
  );

  const updateProgram = useCallback<PersonalContextValue["updateProgram"]>(
    (id, patch) =>
      patchDevelopment((dev) => ({
        ...dev,
        programs: dev.programs.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)),
      })),
    [patchDevelopment],
  );

  const setProgramItemStatus = useCallback<PersonalContextValue["setProgramItemStatus"]>(
    (programId, itemId, status) =>
      patchDevelopment((dev) => ({
        ...dev,
        programs: dev.programs.map((p) =>
          p.id !== programId
            ? p
            : {
                ...p,
                updatedAt: now(),
                items: p.items.map((item) => (item.id === itemId ? { ...item, status } : item)),
              },
        ),
      })),
    [patchDevelopment],
  );

  const completeProgram = useCallback(
    (id: string) =>
      patchDevelopment((dev) => {
        const program = dev.programs.find((p) => p.id === id);
        if (!program) return dev;
        return {
          ...dev,
          programs: dev.programs.map((p) =>
            p.id === id ? { ...p, status: "completed" as const, completedAt: now(), updatedAt: now() } : p,
          ),
          evolution: [
            { id: newId(), kind: "program_completed" as const, title: program.title, at: now() },
            ...dev.evolution,
          ],
        };
      }),
    [patchDevelopment],
  );

  const removeProgram = useCallback(
    (id: string) =>
      patchDevelopment((dev) => ({
        ...dev,
        programs: dev.programs.filter((p) => p.id !== id),
        // Actions created from the program stay: they were the person's work.
        actions: dev.actions.map((a) =>
          a.programId === id ? { ...a, programId: undefined, programItemId: undefined } : a,
        ),
      })),
    [patchDevelopment],
  );

  const addAction = useCallback<PersonalContextValue["addAction"]>(
    (input) => {
      const action: PersonalAction = {
        ...input,
        status: input.status ?? "pending",
        id: newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      patchDevelopment((dev) => ({ ...dev, actions: [action, ...dev.actions] }));
      return action;
    },
    [patchDevelopment],
  );

  const updateAction = useCallback<PersonalContextValue["updateAction"]>(
    (id, patch) =>
      patchDevelopment((dev) => ({
        ...dev,
        actions: dev.actions.map((a) =>
          a.id !== id
            ? a
            : {
                ...a,
                ...patch,
                updatedAt: now(),
                ...(patch.status === "done" ? { completedAt: now() } : {}),
                ...(patch.status && patch.status !== "done" ? { completedAt: undefined } : {}),
              },
        ),
      })),
    [patchDevelopment],
  );

  const removeAction = useCallback(
    (id: string) =>
      patchDevelopment((dev) => ({ ...dev, actions: dev.actions.filter((a) => a.id !== id) })),
    [patchDevelopment],
  );

  const addDecision = useCallback<PersonalContextValue["addDecision"]>(
    (input) => {
      const decision: Decision = {
        ...input,
        status: input.status ?? "active",
        id: newId(),
        createdAt: now(),
        updatedAt: now(),
      };
      patchDevelopment((dev) => ({
        ...dev,
        decisions: [decision, ...dev.decisions],
        evolution: [
          { id: newId(), kind: "decision_recorded" as const, title: decision.statement, at: now() },
          ...dev.evolution,
        ],
      }));
      return decision;
    },
    [patchDevelopment],
  );

  const updateDecision = useCallback<PersonalContextValue["updateDecision"]>(
    (id, patch) =>
      patchDevelopment((dev) => ({
        ...dev,
        decisions: dev.decisions.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: now() } : d)),
      })),
    [patchDevelopment],
  );

  const removeDecision = useCallback(
    (id: string) =>
      patchDevelopment((dev) => ({ ...dev, decisions: dev.decisions.filter((d) => d.id !== id) })),
    [patchDevelopment],
  );

  const addReflection = useCallback<PersonalContextValue["addReflection"]>(
    (input) =>
      patchDevelopment((dev) => ({
        ...dev,
        reflections: [{ ...input, id: newId(), createdAt: now() }, ...dev.reflections],
      })),
    [patchDevelopment],
  );

  const removeReflection = useCallback(
    (id: string) =>
      patchDevelopment((dev) => ({
        ...dev,
        reflections: dev.reflections.filter((r) => r.id !== id),
      })),
    [patchDevelopment],
  );

  const setDailyReflection = useCallback(
    (enabled: boolean) => patchDevelopment((dev) => ({ ...dev, dailyReflectionEnabled: enabled })),
    [patchDevelopment],
  );

  const hideEvolution = useCallback(
    (id: string, hidden: boolean) =>
      patchDevelopment((dev) => ({
        ...dev,
        evolution: dev.evolution.map((e) => (e.id === id ? { ...e, hidden } : e)),
      })),
    [patchDevelopment],
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
      createProgram,
      updateProgram,
      setProgramItemStatus,
      completeProgram,
      removeProgram,
      addAction,
      updateAction,
      removeAction,
      addDecision,
      updateDecision,
      removeDecision,
      addReflection,
      removeReflection,
      setDailyReflection,
      logEvolution,
      hideEvolution,
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
      createProgram,
      updateProgram,
      setProgramItemStatus,
      completeProgram,
      removeProgram,
      addAction,
      updateAction,
      removeAction,
      addDecision,
      updateDecision,
      removeDecision,
      addReflection,
      removeReflection,
      setDailyReflection,
      logEvolution,
      hideEvolution,
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
