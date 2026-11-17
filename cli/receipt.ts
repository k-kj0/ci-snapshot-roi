import { analyzeRepo } from "../lib/analyze";

const arg = process.argv[2];
if (!arg || !arg.includes("/")) {
  console.log("Usage: npm run receipt -- owner/repo");
  process.exit(1);
}
const [owner, repo] = arg.replace(/^https?:\/\/github\.com\//, "").split("/");
const usd = (n: number) => "$" + n.toFixed(2);
const pad = (l: string, r: string, w = 44) => l + " ".repeat(Math.max(1, w - l.length - r.length)) + r;
const line = "-".repeat(44);

async function main() {
  try {
    const r = await analyzeRepo(owner, repo);
    console.log("\n" + line);
    console.log("                CI RECEIPT");
    console.log(`  ${owner}/${repo}`);
    console.log(`  ${r.generatedAt} - ${r.sampledRuns} runs sampled`);
    console.log(line);
    for (const w of r.workflows) {
      console.log(pad(w.name.slice(0, 28), usd(w.githubCost) + "/mo"));
      console.log(`  ~${Math.round(w.jobsPerMonth)} jobs/mo x ${w.avgJobMinutes.toFixed(1)} min`);
      console.log(`  repeated setup: ${w.avgSetupMinutes.toFixed(1)} min/job (${usd(w.wastedSetupCost)}/mo)`);
      const tag = w.verdict === "worth-it" ? "WORTH IT" : w.verdict === "skip" ? "SKIP" : "NOT ENOUGH DATA";
      console.log(`  >> SNAPSHOT: ${tag}`);
      console.log("");
    }
    console.log(line);
    console.log(pad("Wasted on repeated setup", usd(r.totalWasted)));
    console.log(pad("Snapshot savings (worth-it only)", usd(r.totalSnapshotSavings)));
    console.log(line);
    console.log("  Estimate only. Not affiliated with WarpBuild.\n");
  } catch (e) {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
main();
