import { describe, expect, it } from "vitest";

import { buildHorizon, buildMonthlyPlan, monthlyCommitmentMinor, monthlyRecurringMinor } from "./engine";
import type { Commitment, Plan } from "@/lib/personal/types";
import type { RecurringRule } from "@/lib/finance/ledger-types";
import type { AllocationRuleItem } from "@/lib/finance/types";

function commitment(patch: Partial<Commitment>): Commitment {
  return {
    id: "c1",
    name: "Renda",
    amountMinor: 20_000_00,
    cadence: "monthly",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

function recurring(patch: Partial<RecurringRule>): RecurringRule {
  return {
    id: "r1",
    name: "Internet",
    kind: "expense",
    amountMinor: 2_500_00,
    frequency: "monthly",
    startDate: "2026-01-01",
    mode: "reminder",
    active: true,
    ...patch,
  };
}

function purpose(patch: Partial<AllocationRuleItem>): AllocationRuleItem {
  return { id: "p1", name: "Viagem", percentage: 0, icon: "travel", kind: "goals", ...patch };
}

function plan(patch: Partial<Plan>): Plan {
  return {
    id: "pl1",
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

describe("monthly equivalents", () => {
  it("keeps monthly amounts untouched and ignores one-offs", () => {
    expect(monthlyCommitmentMinor(commitment({}))).toBe(20_000_00);
    expect(monthlyCommitmentMinor(commitment({ cadence: "once" }))).toBe(0);
    expect(monthlyCommitmentMinor(commitment({ active: false }))).toBe(0);
  });

  it("spreads yearly costs across twelve months", () => {
    expect(monthlyCommitmentMinor(commitment({ cadence: "yearly", amountMinor: 12_000_00 }))).toBe(1_000_00);
    expect(monthlyRecurringMinor(recurring({ frequency: "quarterly", amountMinor: 3_000_00 }))).toBe(1_000_00);
  });

  it("never counts income rules as a cost", () => {
    expect(monthlyRecurringMinor(recurring({ kind: "income" }))).toBe(0);
  });
});

describe("buildMonthlyPlan", () => {
  const base = {
    commitments: [commitment({})],
    recurring: [recurring({})],
    purposes: [purpose({ monthlyPlanMinor: 5_000_00 }), purpose({ id: "p2", name: "Carro" })],
    reservedByPurpose: { p1: 50_000_00 },
    now: new Date("2026-09-19T00:00:00.000Z"),
  };

  it("adds costs and purpose plans into one monthly outflow", () => {
    const result = buildMonthlyPlan({ ...base, availableMinor: 100_000_00 });
    expect(result.costsTotalMinor).toBe(22_500_00);
    expect(result.purposesTotalMinor).toBe(5_000_00);
    expect(result.outflowMinor).toBe(27_500_00);
    expect(result.leftoverMinor).toBe(72_500_00);
    expect(result.purposes).toHaveLength(2);
  });

  it("projects the date the available money reaches zero", () => {
    const result = buildMonthlyPlan({ ...base, availableMinor: 27_500_00 });
    expect(result.runwayMonths).toBeCloseTo(1, 5);
    expect(result.zeroDateISO).not.toBeNull();
    expect(result.alert).toBe("watch");
  });

  it("alerts when the plan does not fit in the available money", () => {
    expect(buildMonthlyPlan({ ...base, availableMinor: 10_000_00 }).alert).toBe("zero");
    expect(buildMonthlyPlan({ ...base, availableMinor: 0 }).alert).toBe("zero");
  });

  it("stays quiet when there is nothing planned", () => {
    const empty = buildMonthlyPlan({
      commitments: [],
      recurring: [],
      purposes: [],
      reservedByPurpose: {},
      availableMinor: 10_000_00,
    });
    expect(empty.outflowMinor).toBe(0);
    expect(empty.runwayMonths).toBeNull();
    expect(empty.zeroDateISO).toBeNull();
    expect(empty.alert).toBe("none");
  });
});

describe("buildHorizon", () => {
  const now = new Date("2026-09-19T00:00:00.000Z");

  it("splits goals by horizon and says how much is left to protect", () => {
    const result = buildHorizon({
      plans: [
        plan({ targetMinor: 300_000_00, targetDate: "2027-03-19", walletId: "p1" }),
        plan({ id: "pl2", name: "Carro", targetMinor: 900_000_00, targetDate: "2029-01-01" }),
        plan({ id: "pl3", name: "Casa", targetMinor: 500_000_00 }),
        plan({ id: "pl4", name: "Curso", financial: false, targetMinor: 10_000_00 }),
        plan({ id: "pl5", name: "Antigo", status: "archived", targetMinor: 10_000_00 }),
      ],
      reservedByPurpose: { p1: 100_000_00 },
      now,
    });

    expect(result.withinYear.map((g) => g.name)).toEqual(["Turquia"]);
    expect(result.later.map((g) => g.name)).toEqual(["Carro"]);
    expect(result.undated.map((g) => g.name)).toEqual(["Casa"]);

    const turquia = result.withinYear[0]!;
    expect(turquia.toProtectMinor).toBe(200_000_00);
    expect(turquia.monthsLeft).toBe(6);
    expect(turquia.monthlyNeededMinor).toBe(33_333_34);
    expect(turquia.progress).toBeCloseTo(1 / 3, 5);

    expect(result.totalCostMinor).toBe(1_700_000_00);
    expect(result.totalReservedMinor).toBe(100_000_00);
    expect(result.totalToProtectMinor).toBe(1_600_000_00);
    expect(result.monthlyNeededMinor).toBe(33_333_34);
  });

  it("never asks for money a goal already has", () => {
    const result = buildHorizon({
      plans: [plan({ targetMinor: 100_000_00, targetDate: "2027-01-01", walletId: "p1" })],
      reservedByPurpose: { p1: 150_000_00 },
      now,
    });
    expect(result.withinYear[0]!.toProtectMinor).toBe(0);
    expect(result.withinYear[0]!.monthlyNeededMinor).toBe(0);
    expect(result.withinYear[0]!.progress).toBe(1);
  });
});
