import "../../../receipt.css";
import type { Metadata } from "next";
import { analyzeRepo, GITHUB_HOSTED_RATE, PRICING_VERIFIED_ON } from "@/lib/analyze";

type Props = { params: { owner: string; repo: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `CI Receipt: ${params.owner}/${params.repo}`,
    description: `Itemised CI cost and snapshot verdict for ${params.owner}/${params.repo}.`,
  };
}

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const STAMP = { "worth-it": "SNAPSHOT: WORTH IT", skip: "SNAPSHOT: SKIP", "not-enough-data": "NOT ENOUGH DATA" } as const;

export default async function ReceiptPage({ params }: Props) {
  const { owner, repo } = params;
  let report;
  try {
    report = await analyzeRepo(owner, repo);
  } catch (e) {
    return (
      <main className="rc-home">
        <h1>No receipt</h1>
        <p>{e instanceof Error ? e.message : "Something went wrong."}</p>
        <a className="rc-link" href="/">Try another repo</a>
      </main>
    );
  }
  const tweet = encodeURIComponent(`I printed a CI receipt for ${owner}/${repo}: about ${usd(report.totalWasted)}/mo of repeated setup time (estimate). Try yours:`);

  return (
    <main className="rc-page">
      <div className="rc-paper">
        <div className="rc-center">
          <strong>CI RECEIPT</strong>
          <div>{owner}/{repo}</div>
          <div className="rc-dim">{report.generatedAt} · {report.sampledRuns} runs sampled</div>
        </div>
        <hr />
        {report.workflows.map((w) => (
          <div key={w.name} className="rc-item">
            <div className="rc-row rc-bold"><span>{w.name}</span><span>{usd(w.githubCost)}/mo</span></div>
            <div className="rc-dim">~{Math.round(w.jobsPerMonth)} jobs/mo × {w.avgJobMinutes.toFixed(1)} min</div>
            <div className="rc-dim">Repeated setup: {w.avgSetupMinutes.toFixed(1)} min per job ({usd(w.wastedSetupCost)}/mo)</div>
            {w.topSetupSteps.map((s) => (
              <div key={s.name} className="rc-row rc-step"><span>· {s.name.slice(0, 34)}</span><span>{s.avgSeconds.toFixed(0)}s</span></div>
            ))}
            <div className={`rc-stamp ${w.verdict}`}>{STAMP[w.verdict]}</div>
            <div className="rc-dim">{w.verdictReason}</div>
            {w.verdict === "worth-it" && (
              <div className="rc-row"><span>Est. saving with snapshots</span><span>{usd(w.snapshotMonthlySavings)}/mo</span></div>
            )}
          </div>
        ))}
        <hr />
        <div className="rc-row"><span>If run on GitHub-hosted</span><span>{usd(report.totalGithubCost)}</span></div>
        <div className="rc-row"><span>If run on WarpBuild 2x</span><span>{usd(report.totalWarpbuildCost)}</span></div>
        <div className="rc-row rc-bold"><span>Wasted on repeated setup</span><span>{usd(report.totalWasted)}</span></div>
        <div className="rc-row rc-bold"><span>Snapshot savings (where worth it)</span><span>{usd(report.totalSnapshotSavings)}</span></div>
        <hr />
        <div className="rc-fine">
          Estimate only. Public repos run free on GitHub; this shows what the same workload would cost if private. Assumed GitHub rate {usd(GITHUB_HOSTED_RATE)}/min (pricing check: {PRICING_VERIFIED_ON}). Snapshots assumed to remove 80% of dependency-setup time, excluding checkout. Based on a small sample of recent successful runs. Independent prototype, not affiliated with WarpBuild.
        </div>
        <div className="rc-center rc-thanks">*** THANK YOU ***</div>
      </div>
      <div className="rc-cta">
        <a href="https://www.warpbuild.com" target="_blank" rel="noreferrer">Try WarpBuild</a>
        <a className="alt" href={`https://twitter.com/intent/tweet?text=${tweet}`} target="_blank" rel="noreferrer">Share on X</a>
      </div>
      <a className="rc-link" href="/">Print another receipt</a>
    </main>
  );
}
