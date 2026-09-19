import { describe, expect, it } from "vitest";

import { goalPace, percentageConflict, planConflicts, simulatePurchase, suggestOrganization } from "./engine";
import type { Plan, Strategy, StrategyRule } from "./types";

function plan(patch: Partial<Plan> = {}): Plan {
  return {
    id: "p1",
    name: "Turquia",
    type: "travel",
    status: "active",
    priority: "important",
    financial: true,
    milestones: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

function rule(patch: Partial<StrategyRule>): StrategyRule {
  return {
    id: patch.id ?? "r1",
    label: "Regra",
    method: "percentage",
    value: 10,
    targetKind: "plan",
    order: 0,
    enabled: true,
    ...patch,
  };
}

function strategy(rules: StrategyRule[], patch: Partial<Strategy> = {}): Strategy {
  return {
    id: "s1",
    templateKey: "custom",
    name: "Teste",
    description: "",
    mode: "suggest",
    rules,
    createdAt: "",
    updatedAt: "",
    ...patch,
  };
}

describe("goalPace", () => {
  it("returns null for a plan without money", () => {
    expect(goalPace(plan({ financial: false }), 0)).toBeNull();
  });

  it("computes remaining and monthly pace", () => {
    const pace = goalPace(
      plan({ targetMinor: 120_000_00, targetDate: "2026-07-01T00:00:00.000Z" }),
      20_000_00,
      new Date("2026-01-01T00:00:00.000Z"),
    );
    expect(pace?.remainingMinor).toBe(100_000_00);
    expect(pace?.monthsRemaining).toBe(6);
    expect(pace?.requiredMonthlyMinor).toBe(Math.ceil(100_000_00 / 6));
  });

  it("never reports more than 100%", () => {
    const pace = goalPace(plan({ targetMinor: 10_000_00 }), 30_000_00);
    expect(pace?.ratio).toBe(1);
    expect(pace?.remainingMinor).toBe(0);
  });
});

describe("suggestOrganization", () => {
  it("suggests nothing without a strategy", () => {
    const result = suggestOrganization(null, 50_000_00);
    expect(result.lines).toHaveLength(0);
    expect(result.leftoverMinor).toBe(50_000_00);
  });

  it("splits by percentage and leaves the rest available", () => {
    const result = suggestOrganization(
      strategy([rule({ id: "a", value: 20, targetKind: "protection" }), rule({ id: "b", value: 30 })]),
      100_000_00,
    );
    expect(result.lines.map((l) => l.amountMinor)).toEqual([20_000_00, 30_000_00]);
    expect(result.leftoverMinor).toBe(50_000_00);
  });

  it("only organises money above what the person keeps available", () => {
    const result = suggestOrganization(
      strategy([rule({ id: "s", method: "surplus", value: 0 })], { keepAvailableMinor: 10_000_00 }),
      20_000_00,
      { availableBeforeMinor: 5_000_00 },
    );
    expect(result.lines[0]?.amountMinor).toBe(15_000_00);
  });

  it("flags percentages above 100", () => {
    expect(percentageConflict([rule({ id: "a", value: 70 }), rule({ id: "b", value: 50 })])).toBe(120);
  });
});

describe("simulatePurchase", () => {
  it("never touches reserved money, only reports the conflict", () => {
    const scenario = simulatePurchase({
      costMinor: 30_000_00,
      availableMinor: 25_000_00,
      reservedMinor: 40_000_00,
      protectedMinor: 10_000_00,
      activePlanNames: ["Turquia"],
      commitments: [],
    });
    expect(scenario.wouldTouchReserved).toBe(true);
    expect(scenario.reservedMinor).toBe(40_000_00);
    expect(scenario.plansUnaffected).toEqual(["Turquia"]);
  });
});

describe("planConflicts", () => {
  it("reports the gap when plans need more than is possible", () => {
    const conflict = planConflicts(
      [
        { id: "a", name: "Turquia", requiredMonthlyMinor: 20_000_00 },
        { id: "b", name: "Carro", requiredMonthlyMinor: 15_000_00 },
      ],
      25_000_00,
    );
    expect(conflict?.gapMinor).toBe(10_000_00);
  });

  it("stays quiet when everything fits", () => {
    expect(planConflicts([{ id: "a", name: "x", requiredMonthlyMinor: 1000 }], 5000)).toBeNull();
  });
});
