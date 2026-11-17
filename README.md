# Snapshot ROI Autopilot

A decision-support prototype estimating whether WarpBuild CI snapshots are economically worthwhile for a workflow.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

Import this repository into Vercel. Select Next.js. No environment variables are required.

## What it does
- Estimates monthly runner spend without snapshots.
- Estimates spend with snapshots, including restore and storage charges.
- Blocks snapshot recommendations for unsupported platforms.
- Shows break-even setup time and an explainable recommendation.

## Limitations
This is an estimator, not a live WarpBuild integration. Inputs are user-provided. It does not ingest billing exports or prove the counterfactual time saved. Pricing assumptions should be verified against current WarpBuild pricing before financial decisions.
