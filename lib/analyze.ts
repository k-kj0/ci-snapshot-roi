import { calculateROI } from "@/lib/roi";

// ASSUMPTIONS: verify these against the official pricing pages before publishing.
export const GITHUB_HOSTED_RATE = 0.006; // $/min, Linux 2-core (verify!)
export const SNAPSHOT_EFFECTIVENESS = 0.8; // share of setup time a snapshot removes
export const PRICING_VERIFIED_ON = "UNVERIFIED - check before publishing";

const GH = "https://api.github.com";
const RUNS_TO_SAMPLE = 20;

async function gh(path: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(GH + path, { headers, next: { revalidate: 3600 } });
  if (res.status === 404) throw new Error("Repo not found (is it public?)");
  if (res.status === 403)
    throw new Error("GitHub rate limit hit. Add a GITHUB_TOKEN.");
  if (!res.ok) throw new Error(`GitHub error ${res.status}`);
  return res.json();
}

const seconds = (a?: string | null, b?: string | null) => {
  if (!a || !b) return 0;
  const d = (Date.parse(b) - Date.parse(a)) / 1000;
  return Number.isFinite(d) && d > 0 ? d : 0;
};

// Steps a snapshot could realistically remove (checkout is NOT included).
const SETUP_PATTERN =
  /(npm (ci|install)|yarn|pnpm|pip|poetry|bundle install|cargo (fetch|build)|go mod|apt-get|apt install|brew install|docker pull|setup-|install|restore|download deps|dependencies)/i;
const IGNORE_PATTERN = /^(set up job|complete job|post |run actions\/checkout)/i;

function isSetup(name: string) {
  if (IGNORE_PATTERN.test(name)) return false;
  if (/checkout/i.test(name)) return false;
  return SETUP_PATTERN.test(name);
}

export type SetupStep = { name: string; avgSeconds: number };

export type WorkflowReport = {
  name: string;
  runsPerMonth: number;
  jobsPerMonth: number;
  avgJobMinutes: number;
  avgSetupMinutes: number;
  topSetupSteps: SetupStep[];
  githubCost: number;
  warpbuildCost: number;
  snapshotMonthlySavings: number;
  verdict: "worth-it" | "skip" | "not-enough-data";
  verdictReason: string;
};

export type Report = {
  owner: string;
  repo: string;
  sampledRuns: number;
  workflows: WorkflowReport[];
  totalGithubCost: number;
  totalWarpbuildCost: number;
  totalSnapshotSavings: number;
  generatedAt: string;
};

export async function analyzeRepo(owner: string, repo: string): Promise<Report> {
  const runsData = await gh(
    `/repos/${owner}/${repo}/actions/runs?status=success&per_page=${RUNS_TO_SAMPLE}`
  );
  const runs: any[] = runsData.workflow_runs ?? [];
  if (runs.length < 3) {
    throw new Error("Not enough successful workflow runs to analyse.");
  }

  const times = runs.map((r) => Date.parse(r.created_at));
  const spanDays = Math.max(
    1,
    (Math.max(...times) - Math.min(...times)) / 86_400_000
  );

  const jobsPerRun = await Promise.all(
    runs.map((r) =>
      gh(`/repos/${owner}/${repo}/actions/runs/${r.id}/jobs?per_page=100`).then(
        (d) => ({ run: r, jobs: (d.jobs ?? []) as any[] })
      )
    )
  );

  // Group by workflow name
  const groups = new Map<
    string,
    {
      runCount: number;
      jobCount: number;
      jobSeconds: number;
      setupSeconds: number;
      steps: Map<string, { total: number; n: number }>;
    }
  >();

  for (const { run, jobs } of jobsPerRun) {
    const g = groups.get(run.name) ?? {
      runCount: 0,
      jobCount: 0,
      jobSeconds: 0,
      setupSeconds: 0,
      steps: new Map(),
    };
    g.runCount += 1;
    for (const job of jobs) {
      if (job.conclusion !== "success") continue;
      g.jobCount += 1;
      g.jobSeconds += seconds(job.started_at, job.completed_at);
      for (const step of job.steps ?? []) {
        if (step.conclusion !== "success" || !isSetup(step.name)) continue;
        const s = seconds(step.started_at, step.completed_at);
        g.setupSeconds += s;
        const cur = g.steps.get(step.name) ?? { total: 0, n: 0 };
        cur.total += s;
        cur.n += 1;
        g.steps.set(step.name, cur);
      }
    }
    groups.set(run.name, g);
  }

  const workflows: WorkflowReport[] = [];

  for (const [name, g] of groups) {
    if (g.jobCount === 0) continue;

    const runsPerMonth = (g.runCount / spanDays) * 30;
    const jobsPerMonth = (g.jobCount / spanDays) * 30;
    const avgJobMinutes = g.jobSeconds / g.jobCount / 60;
    const avgSetupMinutes = g.setupSeconds / g.jobCount / 60;

    const githubCost = jobsPerMonth * avgJobMinutes * GITHUB_HOSTED_RATE;

    const roi = calculateROI({
      platform: "cloud-ubuntu",
      runner: "x64-2x",
      jobsPerMonth,
      minutesPerJob: avgJobMinutes,
      setupMinutesSaved: avgSetupMinutes * SNAPSHOT_EFFECTIVENESS,
      extraBootMinutes: 0.75,
      snapshotAliases: 1,
      storageHoursPerMonth: 720,
    });

    let verdict: WorkflowReport["verdict"] = "skip";
    let verdictReason = "Restore and storage fees outweigh the minutes saved.";
    if (g.jobCount < 3) {
      verdict = "not-enough-data";
      verdictReason = "Too few runs in the sample to judge.";
    } else if (roi.monthlySavings > 1) {
      verdict = "worth-it";
      verdictReason = "Repeated setup time costs more than snapshot fees.";
    }

    const topSetupSteps = [...g.steps.entries()]
      .map(([stepName, v]) => ({
        name: stepName,
        avgSeconds: v.total / v.n,
      }))
      .sort((a, b) => b.avgSeconds - a.avgSeconds)
      .slice(0, 4);

    workflows.push({
      name,
      runsPerMonth,
      jobsPerMonth,
      avgJobMinutes,
      avgSetupMinutes,
      topSetupSteps,
      githubCost,
      warpbuildCost: roi.baselineMonthlyCost,
      snapshotMonthlySavings: roi.monthlySavings,
      verdict,
      verdictReason,
    });
  }

  workflows.sort((a, b) => b.githubCost - a.githubCost);
  const top = workflows.slice(0, 5);

  return {
    owner,
    repo,
    sampledRuns: runs.length,
    workflows: top,
    totalGithubCost: top.reduce((s, w) => s + w.githubCost, 0),
    totalWarpbuildCost: top.reduce((s, w) => s + w.warpbuildCost, 0),
    totalSnapshotSavings: top.reduce(
      (s, w) => s + (w.verdict === "worth-it" ? w.snapshotMonthlySavings : 0),
      0
    ),
    generatedAt: new Date().toISOString().slice(0, 10),
  };
}
