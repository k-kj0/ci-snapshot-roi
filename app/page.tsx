"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import "./receipt.css";

export default function Home() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  function go(v?: string) {
    const cleaned = (v ?? value).trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    const [owner, repo] = cleaned.split("/");
    if (!owner || !repo) { setError("Enter a repo like facebook/react"); return; }
    router.push(`/r/${owner}/${repo}`);
  }
  return (
    <main className="rc-home">
      <h1>CI Receipt</h1>
      <p>Paste any public GitHub repo. Get an itemised receipt of its repeated CI setup time, with an honest verdict on whether snapshots would help.</p>
      <div className="rc-form">
        <input placeholder="owner/repo  (e.g. facebook/react)" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        <button onClick={() => go()}>Print receipt</button>
      </div>
      {error && <div className="rc-error">{error}</div>}
      <p><a className="rc-link" href="/leaderboard">See receipts for famous repos</a></p>
      <small>Independent prototype. Not affiliated with WarpBuild or GitHub.</small>
    </main>
  );
}
