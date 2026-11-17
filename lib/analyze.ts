/* eslint-disable */
import { calculateROI } from "@/lib/roi";

// ASSUMPTIONS: verify against official pricing pages before publishing.
export const GITHUB_HOSTED_RATE = 0.006;
export const SNAPSHOT_EFFECTIVENESS = 0.8;
export const PRICING_VERIFIED_ON = "Nov 2026, from published 2-core Linux rate reports";

const RUNS_TO_SAMPLE = 20;

async function gh(path: string) {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch("https://api.github.com" + path, { headers, next: { revalidate: 3600 } });
  if (res.status === 404) throw new Error("Repo not found (is it public?)");
  if (res.status === 403) throw new Error("GitHub rate limit hit. Add GITHUB_TOKEN to .env.local");
  if (!res.ok) throw new Error("GitHub error " + res.status);
  return res.json();
}

const seconds = (a?: string | null, b?: string | null) => {
  if (!a || !b) return 0;
  const d = (Date.parse(b) - Date.parse(a)) / 1000;
  return Number.isFinite(d) && d > 0 ? d : 0;
};

const SETUP = /(npm (ci|install)|yarn|pnpm|pip|poetry|bundle install|cargo (fetch|build)|go mod|apt-get|apt install|brew install|docker pull|setup-|install|restore|dependencies)/i;
const IGNORE = /^(set up job|complete job|post )/i;
const isSetup = (n: string) => !IGNORE.test(n) && !/checkout/i.test(n) && SETUP.test(n);

export type WorkflowReport = {
  name: string; jobsPerMonth: number; avgJobMinutes: number; avgSetupMinutes: number;
  topSetupSteps: { name: string; avgSeconds: number }[];
  githubCost: number; warpbuildCost: number; wastedSetupCost: number; snapshotMonthlySavings: number;
  verdict: "worth-it" | "skip" | "not-enough-data"; verdictReason: string;
};
export type Report = {
  owner: string; repo: string; sampledRuns: number; workflows: WorkflowReport[];
  totalGithubCost: number; totalWarpbuildCost: number; totalWasted: number; totalSnapshotSavings: number; generatedAt: string;
};

export async function analyzeRepo(owner: string, repo: string): Promise<Report> {
  const data = await gh(`/repos/${owner}/${repo}/actions/runs?status=success&per_page=${RUNS_TO_SAMPLE}`);
  const runs: any[] = data.workflow_runs ?? [];
  if (runs.length < 3) throw new Error("Not enough successful workflow runs to analyse. Try a busier repo.");

  const times = runs.map((r) => Date.parse(r.created_at));
  const spanDays = Math.max(1, (Math.max(...times) - Math.min(...times)) / 86400000);

  const all = await Promise.all(
    runs.map((r) =>
      gh(`/repos/${owner}/${repo}/actions/runs/${r.id}/jobs?per_page=100`).then((d) => ({ run: r, jobs: (d.jobs ?? []) as any[] }))
    )
  );

  const groups = new Map<string, { jobCount: number; jobSeconds: number; setupSeconds: number; steps: Map<string, { t: number; n: number }> }>();
  for (const { run, jobs } of all) {
    const g = groups.get(run.name) ?? { jobCount: 0, jobSeconds: 0, setupSeconds: 0, steps: new Map() };
    for (const job of jobs) {
      if (job.conclusion !== "success") continue;
      g.jobCount += 1;
      g.jobSeconds += seconds(job.started_at, job.completed_at);
      for (const st of job.steps ?? []) {
        if (st.conclusion !== "success" || !isSetup(st.name)) continue;
        const s = seconds(st.started_at, st.completed_at);
        g.setupSeconds += s;
        const c = g.steps.get(st.name) ?? { t: 0, n: 0 };
        c.t += s; c.n += 1;
        g.steps.set(st.name, c);
      }
    }
    groups.set(run.name, g);
  }

  const list: WorkflowReport[] = [];
  for (const [name, g] of groups) {
    if (g.jobCount === 0) continue;
    const jobsPerMonth = (g.jobCount / spanDays) * 30;
    const avgJobMinutes = g.jobSeconds / g.jobCount / 60;
    const avgSetupMinutes = g.setupSeconds / g.jobCount / 60;
    const githubCost = jobsPerMonth * avgJobMinutes * GITHUB_HOSTED_RATE;
    const wastedSetupCost = jobsPerMonth * avgSetupMinutes * GITHUB_HOSTED_RATE;
    const roi = calculateROI({
      platform: "cloud-ubuntu", runner: "x64-2x", jobsPerMonth, minutesPerJob: avgJobMinutes,
      setupMinutesSaved: avgSetupMinutes * SNAPSHOT_EFFECTIVENESS, extraBootMinutes: 0.75,
      snapshotAliases: 1, storageHoursPerMonth: 720,
    });
    let verdict: WorkflowReport["verdict"] = "skip";
    let verdictReason = "Restore and storage fees outweigh the minutes saved.";
    if (g.jobCount < 3) { verdict = "not-enough-data"; verdictReason = "Too few runs in the sample to judge."; }
    else if (roi.monthlySavings > 1) { verdict = "worth-it"; verdictReason = "Repeated setup time costs more than snapshot fees."; }
    list.push({
      name, jobsPerMonth, avgJobMinutes, avgSetupMinutes,
      topSetupSteps: [...g.steps.entries()].map(([n, v]) => ({ name: n, avgSeconds: v.t / v.n })).sort((a, b) => b.avgSeconds - a.avgSeconds).slice(0, 4),
      githubCost, warpbuildCost: roi.baselineMonthlyCost, wastedSetupCost, snapshotMonthlySavings: roi.monthlySavings, verdict, verdictReason,
    });
  }
  list.sort((a, b) => b.githubCost - a.githubCost);
  const top = list.slice(0, 5);
  return {
    owner, repo, sampledRuns: runs.length, workflows: top,
    totalGithubCost: top.reduce((s, w) => s + w.githubCost, 0),
    totalWarpbuildCost: top.reduce((s, w) => s + w.warpbuildCost, 0),
    totalWasted: top.reduce((s, w) => s + w.wastedSetupCost, 0),
    totalSnapshotSavings: top.reduce((s, w) => s + (w.verdict === "worth-it" ? w.snapshotMonthlySavings : 0), 0),
    generatedAt: new Date().toISOString().slice(0, 10),
  };
}
