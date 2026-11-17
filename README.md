cat > app/leaderboard/page.tsx <<'EOF'
import "../receipt.css";

const GROUPS: Record<string, string[]> = {
  "JavaScript / TypeScript": ["facebook/react", "vercel/next.js", "vuejs/core", "sveltejs/svelte"],
  "Python": ["psf/requests", "pallets/flask", "django/django", "pandas-dev/pandas"],
  "Rust and Go": ["BurntSushi/ripgrep", "tokio-rs/tokio", "junegunn/fzf", "gohugoio/hugo"],
  "Docker-heavy": ["grafana/grafana", "home-assistant/core", "moby/moby"],
  "Java": ["spring-projects/spring-boot", "apache/kafka"],
  "Uses other CI (expect little data)": ["golang/go", "kubernetes/kubernetes"],
};

export default function Leaderboard() {
  return (
    <main className="rc-home">
      <h1>Receipts for well-known repos</h1>
      <p>Click a repo to print its CI receipt. The first one for each repo can take up to 30 seconds.</p>
      {Object.entries(GROUPS).map(([group, repos]) => (
        <div key={group} style={{ textAlign: "left", marginTop: 22 }}>
          <div className="rc-badge">{group}</div>
          <ul className="rc-list">
            {repos.map((r) => (<li key={r}><a href={`/r/${r}`}>{r}</a></li>))}
          </ul>
        </div>
      ))}
      <a className="rc-link" href="/">Back</a>
    </main>
  );
}
EOF
npm run build && git add . && git commit -m "Leaderboard: group repos by type" && git push origin main
