import { describe, expect, it } from "vitest";

import { checkAllocation, fundingMap, generateScenarios, nearestPlan } from "./engine";
import type { OrganizeDraft } from "./types";

const base: OrganizeDraft = {
  totalMinor: 90_000_000, // 900.000
  currencyCode: "MZN",
  protection: "amount",
  protectionMinor: 60_000_000,
  plans: [
    {
      planId: "p1",
      name: "Turquia",
      priority: "now",
      targetMinor: 30_000_000,
      targetDate: "2026-12-01",
      reservedMinor: 0,
      include: true,
    },
    {
      planId: "p2",
      name: "Carro",
      priority: "important",
      targetMinor: 80_000_000,
      targetDate: "2027-06-01",
      reservedMinor: 0,
      include: true,
    },
  ],
  commitmentsMonthlyMinor: 3_500_000,
  reserveCommitments: false,
  income: "regular",
  ownership: "personal",
  flexibility: "safety",
  minAvailableMinor: 10_000_000,
  updatedAt: "2026-09-19T00:00:00.000Z",
};

const now = new Date("2026-09-19T00:00:00.000Z");

describe("organisation engine", () => {
  it("never organises more money than exists", () => {
    for (const scenario of generateScenarios(base, now)) {
      expect(scenario.totalMinor).toBe(base.totalMinor);
      for (const line of scenario.lines) expect(line.amountMinor).toBeGreaterThanOrEqual(0);
    }
  });

  it("respects the minimum available the person asked for", () => {
    for (const scenario of generateScenarios(base, now)) {
      const available = scenario.lines.find((line) => line.kind === "available");
      expect(available?.amountMinor ?? 0).toBeGreaterThanOrEqual(base.minAvailableMinor);
    }
  });

  it("puts the preferred direction first without calling it best", () => {
    expect(generateScenarios(base, now)[0]?.id).toBe("safety");
    expect(generateScenarios({ ...base, flexibility: "plans" }, now)[0]?.id).toBe("plans");
  });

  it("gives the nearest plan more money when the focus is on plans", () => {
    const scenario = generateScenarios({ ...base, flexibility: "plans" }, now).find((s) => s.id === "plans");
    const turquia = scenario?.lines.find((line) => line.planId === "p1")?.amountMinor ?? 0;
    const carro = scenario?.lines.find((line) => line.planId === "p2")?.amountMinor ?? 0;
    expect(turquia).toBeGreaterThan(carro);
  });

  it("never funds a plan beyond what it still needs", () => {
    const scenario = generateScenarios(
      { ...base, plans: [{ ...base.plans[0]!, targetMinor: 1_000_000 }] },
      now,
    )[0];
    expect(scenario?.lines.find((line) => line.planId === "p1")?.amountMinor).toBeLessThanOrEqual(1_000_000);
  });

  it("lowers protection instead of breaking the available floor", () => {
    const scenario = generateScenarios(
      { ...base, totalMinor: 65_000_000, minAvailableMinor: 10_000_000 },
      now,
    )[0];
    const available = scenario?.lines.find((line) => line.kind === "available")?.amountMinor ?? 0;
    expect(available).toBeGreaterThanOrEqual(10_000_000);
    expect(scenario?.totalMinor).toBe(65_000_000);
  });

  it("flags allocations above the real money", () => {
    const check = checkAllocation(
      [{ key: "a", label: "a", kind: "protected", amountMinor: 95_000_000 }],
      90_000_000,
    );
    expect(check.ok).toBe(false);
    expect(check.overByMinor).toBe(5_000_000);
  });

  it("maps reservations onto real accounts without moving money", () => {
    const map = fundingMap(
      [
        { key: "protected", label: "Protegido", kind: "protected", amountMinor: 60_000_000 },
        { key: "plan:p1", label: "Turquia", kind: "plan", amountMinor: 10_000_000 },
        { key: "available", label: "Disponível", kind: "available", amountMinor: 20_000_000 },
      ],
      [
        { id: "a1", name: "BIM", balanceMinor: 70_000_000 },
        { id: "a2", name: "M-Pesa", balanceMinor: 15_000_000 },
        { id: "a3", name: "Moza", balanceMinor: 5_000_000 },
      ],
    );
    expect(map).toHaveLength(2);
    expect(map[0]?.from.reduce((s, f) => s + f.amountMinor, 0)).toBe(60_000_000);
    expect(map[1]?.from[0]?.accountName).toBe("BIM");
  });

  it("finds the plan with the closest date", () => {
    expect(nearestPlan(base.plans)?.name).toBe("Turquia");
  });
});
