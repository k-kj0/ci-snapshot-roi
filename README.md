# CI Receipt

Paste a public GitHub repo and get an itemised CI cost receipt: what each workflow costs per month, how much of that is repeated setup work, and whether a snapshot-based faster runner would pay off (**WORTH IT**, **SKIP**, or **NOT ENOUGH DATA**).

**Live:** https://ci-snapshot-roi.vercel.app

Independent project. Not affiliated with WarpBuild or GitHub. All numbers are estimates, not bills.

## What it does

- Samples the 20 most recent successful workflow runs of a public repo through the GitHub Actions API.
- Reads step-level timings for every job and flags steps that look like repeated setup (installs, restores, `setup-*` actions).
- Models runner minutes, snapshot restore fees and storage to give a per-workflow verdict.
- Shareable permalink and social preview image per repo (`/r/owner/repo`).
- Migration diff page (`/m/owner/repo`) showing which `runs-on` lines are candidates to rewrite.
- Leaderboard of well-known repos (`/leaderboard`) and a CLI.

## Run it

```bash
npm install
npm run dev                         # web app on localhost:3000
npm run receipt -- owner/repo       # CLI receipt
npm test                            # cost model unit tests
```

Set `GITHUB_TOKEN` in `.env.local` to avoid the unauthenticated GitHub rate limit (60 requests/hour).

## How the verdict is computed

| Assumption | Value | Where |
|---|---|---|
| GitHub-hosted 2-core Linux rate | $0.006/min | `lib/analyze.ts` |
| Share of repeated setup removed by a snapshot | 80% | `lib/analyze.ts` |
| Extra boot time per job with a snapshot | 0.75 min | `lib/analyze.ts` |
| Snapshot restore fee | $0.04 per job | `lib/roi.ts` |
| Snapshot storage | $0.025 per hour per alias | `lib/roi.ts` |

Costs are "if this repo were private". Public repos run free on GitHub-hosted runners, so these show what the same workload would cost.

## Results from real repos

Sampled 2026-11-17, the 20 most recent successful runs per repo. **These numbers were captured before the Dependabot fix below; re-run the tool before quoting any of them.**

| Repo | Workflow | Est. cost/mo | Jobs/mo x min | Repeated setup/job | Verdict |
|---|---|---|---|---|---|
| microsoft/vscode | Code OSS | $59.80 | ~2310 x 4.3 | 0.8 min ($10.42/mo) | SKIP |
| microsoft/vscode | Component Fixtures | $14.52 | ~900 x 2.7 | 0.3 min ($1.59/mo) | SKIP |
| microsoft/vscode | CodeQL | $2.44 | ~60 x 6.8 | 0.0 min | NOT ENOUGH DATA |
| spring-projects/spring-boot | CI | $34.17 | ~420 x 13.6 | 0.0 min | SKIP |
| spring-projects/spring-boot | Build Pull Request | $10.35 | ~120 x 14.4 | 0.0 min | SKIP |
| spring-projects/spring-boot | Build and Deploy Documentation (main) | $0.98 | ~60 x 2.7 | 0.9 min ($0.34/mo) | NOT ENOUGH DATA |
| BurntSushi/ripgrep | ci | $14.52 | ~1232 x 2.0 | 0.3 min ($1.94/mo) | SKIP |
| junegunn/fzf | build | $0.59 | ~14 x 6.9 | 0.4 min ($0.03/mo) | SKIP |
| vercel/next.js | upload-preview-tarballs | $0.37 | ~120 x 0.5 | 0.0 min | SKIP |
| psf/requests | CodeQL | $0.04 | ~7 x 1.0 | 0.0 min | NOT ENOUGH DATA |

Only a selection of workflows is shown. Full output is available by running the CLI on each repo.

## What testing showed

- **No workflow came out WORTH IT.** Most setup in these repos is under a minute per job, and the restore fee plus assumed boot time cancel the saving.
- **This is partly my model.** With 0.75 min of boot time and 80% setup removal, any workflow with under about 0.94 min of setup cannot be WORTH IT whatever the fees. A sensitivity range (50% / 80% / 100% effectiveness) is the next planned change.
- **The biggest repeated-setup bill was vscode's main workflow**, about $10/mo if it were private. Still SKIP.
- **Spring Boot shows 0.0 min of setup.** I have not confirmed whether that is true or whether the step-name matching misses its steps (for example "Set up JDK" contains a space, so the `setup-` pattern does not match it).
- **Sampling matters.** The 20 most recent runs of next.js were mostly small bot workflows, so its receipt says little about its real CI.

## Bugs found by testing

- Dependabot update runs were counted as workflows. They are now filtered out (`event === "dynamic"`).
- Repos that do not use GitHub Actions (for example `torvalds/linux`) printed a near-empty receipt from a few Dependabot runs. They now return "Not enough successful workflow runs".

## Known limitations

- 20-run sample only. Monthly figures are extrapolated from the time span of those runs.
- Setup detection is regex-based on step names, so it can miss steps with unusual names and flag steps that are not really setup.
- Pricing constants are hard-coded. Check them against current pricing pages before relying on a verdict.
- Public repositories only.
