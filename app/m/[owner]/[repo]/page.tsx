import "../../../receipt.css";
import { migrationDiff, TARGET_LABEL } from "@/lib/migrate";

type Props = { params: { owner: string; repo: string } };

export default async function Migrate({ params }: Props) {
  const { owner, repo } = params;
  let diffs;
  try {
    diffs = await migrationDiff(owner, repo);
  } catch (e) {
    return (
      <main className="rc-home">
        <h1>No diff</h1>
        <p>{e instanceof Error ? e.message : "Something went wrong."}</p>
        <a className="rc-link" href="/">Back</a>
      </main>
    );
  }
  const total = diffs.reduce((s, d) => s + d.changes.length, 0);
  return (
    <main className="rc-home" style={{ maxWidth: 760, textAlign: "left" }}>
      <h1>Migration diff</h1>
      <p>
        {owner}/{repo}: {total} safe change{total === 1 ? "" : "s"} found. Only plain Ubuntu <code>runs-on</code> lines are rewritten to <code>{TARGET_LABEL}</code>. Matrix, macOS, Windows and custom labels are left alone on purpose, so nothing breaks silently.
      </p>
      {diffs.map((d) => (
        <div key={d.file} className="mg-file">
          <div className="mg-name">.github/workflows/{d.file}</div>
          {d.changes.length === 0 && <div className="rc-dim">No safe automatic changes{d.skipped ? ` (${d.skipped} runs-on line(s) skipped)` : ""}.</div>}
          {d.changes.map((c) => (
            <div key={c.line}>
              <div className="mg-line">line {c.line}</div>
              <div className="mg-del">- {c.before}</div>
              <div className="mg-add">+ {c.after}</div>
            </div>
          ))}
          {d.changes.length > 0 && d.skipped > 0 && <div className="rc-dim">{d.skipped} other runs-on line(s) skipped.</div>}
        </div>
      ))}
      <p><small>Independent prototype. Review every change before committing. Not affiliated with WarpBuild or GitHub.</small></p>
      <a className="rc-link" href={`/r/${owner}/${repo}`}>Back to receipt</a>
    </main>
  );
}
