import "../receipt.css";

const REPOS = ["facebook/react", "vercel/next.js", "microsoft/vscode", "denoland/deno", "rust-lang/rust", "grafana/grafana", "home-assistant/core", "pytorch/pytorch"];

export default function Leaderboard() {
  return (
    <main className="rc-home">
      <h1>Famous repo receipts</h1>
      <p>Click a repo to print its CI receipt. Each one takes a few seconds the first time.</p>
      <ul className="rc-list">
        {REPOS.map((r) => (<li key={r}><a href={`/r/${r}`}>{r}</a></li>))}
      </ul>
      <a className="rc-link" href="/">Back</a>
    </main>
  );
}
