export type Platform = "cloud-ubuntu" | "cloud-windows" | "cloud-macos" | "byoc";
export type Runner = "x64-2x" | "x64-4x" | "x64-8x" | "x64-16x" | "x64-32x" | "arm64-2x" | "arm64-4x" | "arm64-8x" | "arm64-16x" | "arm64-32x";

// ASSUMPTION: only x64 2x-16x and arm64 2x come from the published table. Verify the rest.
export const RUNNER_RATES: Record<Runner, number> = {
  "x64-2x": 0.004, "x64-4x": 0.008, "x64-8x": 0.016, "x64-16x": 0.032, "x64-32x": 0.064,
  "arm64-2x": 0.003, "arm64-4x": 0.006, "arm64-8x": 0.012, "arm64-16x": 0.024, "arm64-32x": 0.048,
};
export const SNAPSHOT_RESTORE_COST = 0.04;
export const SNAPSHOT_STORAGE_PER_HOUR = 0.025;

export interface ROIInput {
  platform: Platform; runner: Runner; jobsPerMonth: number; minutesPerJob: number;
  setupMinutesSaved: number; extraBootMinutes: number; snapshotAliases: number; storageHoursPerMonth: number;
}

export function calculateROI(input: ROIInput) {
  const runnerRate = RUNNER_RATES[input.runner];
  const supported = input.platform === "cloud-ubuntu";
  const jobs = Math.max(0, input.jobsPerMonth);
  const base = Math.max(0, input.minutesPerJob);
  const saved = Math.max(0, input.setupMinutesSaved);
  const boot = Math.max(0, input.extraBootMinutes);
  const aliases = Math.max(0, input.snapshotAliases);
  const hours = Math.max(0, input.storageHoursPerMonth);
  const snapMinutes = Math.max(0, base - saved + boot);
  const baselineRunnerCost = base * runnerRate * jobs;
  const snapshotRunnerCost = snapMinutes * runnerRate * jobs;
  const restoreCost = jobs * SNAPSHOT_RESTORE_COST;
  const storageCost = aliases * hours * SNAPSHOT_STORAGE_PER_HOUR;
  const baselineMonthlyCost = baselineRunnerCost;
  const snapshotMonthlyCost = snapshotRunnerCost + restoreCost + storageCost;
  const monthlySavings = baselineMonthlyCost - snapshotMonthlyCost;
  return { supported, runnerRate, baselineRunnerCost, snapshotRunnerCost, restoreCost, storageCost, baselineMonthlyCost, snapshotMonthlyCost, monthlySavings };
}
export const estimateROI = calculateROI as any;
