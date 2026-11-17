"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import "./receipt.css";

const EXAMPLES = ["facebook/react", "vercel/next.js", "denoland/deno", "grafana/grafana"];

export default function Home() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function go(v?: string) {
    const cleaned = (v ?? value).trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    const [owner, repo] = cleaned.split("/");
    if (!owner || !repo) { setError("Enter a repo like facebook/react"); return; }
    setError("");
    setBusy(true);
    router.push(`/r/${owner}/${repo}`);
  }

  return (
    <main className="rc-home">
      <div className="rc-badge">CI COST CHECK</div>
      <h1>CI Receipt</h1>
      <p>
        Paste any public GitHub repo. Get an itemised receipt of the CI setup time it repeats on every run,
        plus an honest verdict: would snapshots actually pay off, or <strong>skip</strong> them?
      </p>
      <div className="rc-form">
        <input
          placeholder="owner/repo  (e.g. facebook/react)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
        />
        <button onClick={() => go()} disabled={busy}>{busy ? "Printing…" : "Print receipt"}</button>
      </div>
      {error && <div className="rc-error">{error}</div>}

      <div className="rc-chips">
        <span>Try one:</span>
        {EXAMPLES.map((r) => (
          <button key={r} className="rc-chip" onClick={() => go(r)}>{r}</button>
        ))}
      </div>

      <div className="rc-steps">
        <div><b>1</b><span>Reads recent workflow runs from the GitHub API</span></div>
        <div><b>2</b><span>Finds repeated setup: installs, toolchains, pulls</span></div>
        <div><b>3</b><span>Prices it and says WORTH IT or SKIP</span></div>
      </div>

      <small>Estimates from sampled run data. Independent prototype. Not affiliated with WarpBuild or GitHub.</small>
    </main>
  );
}
