# CI Receipt

**Paste a public GitHub repo. Get a receipt of its repeated CI setup time, and an honest verdict on whether CI snapshots would pay off.**

Most tools tell you a new feature will save money. This one is allowed to say **SKIP**.

Live demo: _add your Vercel link here_  |  Demo video: _add link here_

## What it does

- **Receipt** (`/r/owner/repo`): reads real step timings from the GitHub Actions API, finds repeated setup work (dependency installs, toolchain setup, image pulls), and prices it.
- **Verdict per workflow**: WORTH IT, SKIP, or NOT ENOUGH DATA, after counting runner minutes saved, restore fees and storage.
- **Migration diff** (`/m/owner/repo`): shows the exact `runs-on` lines that are safe to rewrite. Matrix, macOS, Windows and custom labels are left alone on purpose.
- **Share loop**: every receipt has its own link and preview image.
- **CLI**: `npm run receipt -- owner/repo`

## How the money math works

See `lib/roi.ts`.

    savings = baseline runner cost
              - (runner cost with setup removed + boot overhead)
              - restore fee per job
              - storage per snapshot-hour

Covered by tests in `tests/roi.test.ts`, including cases where snapshots lose money.

## Honest limits

- Public repos run free on GitHub. The receipt shows what the same workload would cost if private.
- "Snapshots remove 80% of setup time" is an **assumption**, not a measurement.
- Step classification is a name-matching heuristic and can misjudge custom steps.
- Based on about 20 recent successful runs, so small samples are noisy.
- Prices are list prices at the date shown on each receipt. Verify before relying on them.
- Independent project. Not affiliated with WarpBuild or GitHub.

## Run it

    npm install
    echo "GITHUB_TOKEN=your_token" > .env.local
    npm run dev
    npm test
