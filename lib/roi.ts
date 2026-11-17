export type Platform =
  | "cloud-ubuntu"
  | "cloud-windows"
  | "cloud-macos"
  | "byoc";

export type Runner =
  | "x64-2x"
  | "x64-4x"
  | "x64-8x"
  | "x64-16x"
  | "x64-32x"
  | "arm64-2x"
  | "arm64-4x"
  | "arm64-8x"
  | "arm64-16x"
  | "arm64-32x";

export const RUNNER_RATES: Record<Runner, number> = {
  "x64-2x": 0.004,
  "x64-4x": 0.008,
  "x64-8x": 0.016,
  "x64-16x": 0.032,
  "x64-32x": 0.064,
  "arm64-2x": 0.003,
  "arm64-4x": 0.006,
  "arm64-8x": 0.012,
  "arm64-16x": 0.024,
  "arm64-32x": 0.048,
};

export const SNAPSHOT_RESTORE_COST = 0.04;
export const SNAPSHOT_STORAGE_PER_HOUR = 0.025;
export const SNAPSHOT_MAX_AGE_DAYS = 15;

export interface ROIInput {
  platform: Platform;
  runner: Runner;
  jobsPerMonth: number;
  minutesPerJob: number;
  setupMinutesSaved: number;
  extraBootMinutes: number;
  snapshotAliases: number;
  storageHoursPerMonth: number;
}

export interface ROIResult {
  supported: boolean;
  runnerRate: number;
  baselineRunnerCost: number;
  snapshotRunnerCost: number;
  restoreCost: number;
  storageCost: number;
  baselineMonthlyCost: number;
  snapshotMonthlyCost: number;
  monthlySavings: number;
  savingsPercent: number;
  baselineMinutesPerJob: number;
  snapshotMinutesPerJob: number;
  netMinutesSavedPerJob: number;
  breakEvenMinutesPerJob: number;
  recommendation: "enable" | "disable" | "insufficient";
  explanation: string;
}

export function calculateROI(input: ROIInput): ROIResult {
  const runnerRate = RUNNER_RATES[input.runner];

  const supported = input.platform === "cloud-ubuntu";

  const jobs = Math.max(0, input.jobsPerMonth);
  const baselineMinutes = Math.max(0, input.minutesPerJob);
  const setupSaved = Math.max(0, input.setupMinutesSaved);
  const bootOverhead = Math.max(0, input.extraBootMinutes);
  const aliases = Math.max(0, input.snapshotAliases);
  const storageHours = Math.max(0, input.storageHoursPerMonth);

  const snapshotMinutes = Math.max(
    0,
    baselineMinutes - setupSaved + bootOverhead
  );

  const baselineRunnerCost =
    baselineMinutes * runnerRate * jobs;

  const snapshotRunnerCost =
    snapshotMinutes * runnerRate * jobs;

  const restoreCost = jobs * SNAPSHOT_RESTORE_COST;

  const storageCost =
    aliases * storageHours * SNAPSHOT_STORAGE_PER_HOUR;

  const baselineMonthlyCost = baselineRunnerCost;

  const snapshotMonthlyCost =
    snapshotRunnerCost + restoreCost + storageCost;

  const monthlySavings =
    baselineMonthlyCost - snapshotMonthlyCost;

  const savingsPercent =
    baselineMonthlyCost > 0
      ? (monthlySavings / baselineMonthlyCost) * 100
      : 0;

  const netMinutesSavedPerJob =
    setupSaved - bootOverhead;

  const breakEvenMinutesPerJob =
    runnerRate > 0 && jobs > 0
      ? (SNAPSHOT_RESTORE_COST +
          storageCost / jobs) /
        runnerRate +
        bootOverhead
      : 0;

  let recommendation: ROIResult["recommendation"] =
    "insufficient";

  let explanation =
    "Enter valid workflow measurements to calculate a recommendation.";

  if (!supported) {
    recommendation = "disable";
    explanation =
      "Snapshots are supported only on WarpBuild Cloud Ubuntu runners. This runner type is not eligible.";
  } else if (
    jobs === 0 ||
    baselineMinutes === 0 ||
    aliases === 0
  ) {
    recommendation = "insufficient";
    explanation =
      "Add job volume, duration and snapshot alias information before making a decision.";
  } else if (monthlySavings > 0) {
    recommendation = "enable";
    explanation =
      "Based on these inputs, the estimated runner-minute savings exceed restore and storage costs.";
  } else {
    recommendation = "disable";
    explanation =
      "Based on these inputs, snapshot restore and storage costs exceed the estimated runner-minute savings.";
  }

  return {
    supported,
    runnerRate,
    baselineRunnerCost,
    snapshotRunnerCost,
    restoreCost,
    storageCost,
    baselineMonthlyCost,
    snapshotMonthlyCost,
    monthlySavings,
    savingsPercent,
    baselineMinutesPerJob: baselineMinutes,
    snapshotMinutesPerJob: snapshotMinutes,
    netMinutesSavedPerJob,
    breakEvenMinutesPerJob,
    recommendation,
    explanation,
  };
}
