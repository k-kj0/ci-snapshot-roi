import { describe, it, expect } from "vitest";
import { calculateROI } from "../lib/roi";

const base = {
  platform: "cloud-ubuntu" as const,
  runner: "x64-16x" as const,
  jobsPerMonth: 1000,
  minutesPerJob: 20,
  setupMinutesSaved: 8,
  extraBootMinutes: 0.75,
  snapshotAliases: 1,
  storageHoursPerMonth: 720,
};

describe("calculateROI", () => {
  it("recommends savings for a heavy runner with long setup", () => {
    const r = calculateROI(base);
    expect(r.baselineMonthlyCost).toBeCloseTo(640);
    expect(r.snapshotMonthlyCost).toBeCloseTo(466);
    expect(r.monthlySavings).toBeCloseTo(174);
  });

  it("goes negative when restore fees beat the minutes saved (2x runner, 4 min saved)", () => {
    const r = calculateROI({ ...base, runner: "x64-2x", setupMinutesSaved: 4 });
    expect(r.monthlySavings).toBeCloseTo(-45);
  });

  it("marks non-Ubuntu-cloud platforms as unsupported", () => {
    expect(calculateROI({ ...base, platform: "cloud-windows" }).supported).toBe(false);
    expect(calculateROI({ ...base, platform: "cloud-macos" }).supported).toBe(false);
    expect(calculateROI(base).supported).toBe(true);
  });

  it("clamps negative inputs instead of producing nonsense", () => {
    const r = calculateROI({ ...base, jobsPerMonth: -5 });
    expect(r.baselineMonthlyCost).toBe(0);
    expect(r.restoreCost).toBe(0);
  });

  it("charges storage per alias", () => {
    const one = calculateROI(base).storageCost;
    const two = calculateROI({ ...base, snapshotAliases: 2 }).storageCost;
    expect(two).toBeCloseTo(one * 2);
  });
});
