/* eslint-disable */
// ASSUMPTION: verify this label format against WarpBuild's runner docs before publishing.
export const TARGET_LABEL = "warp-ubuntu-latest-x64-2x";

export type Change = { line: number; before: string; after: string };
export type WorkflowDiff = { file: string; changes: Change[]; skipped: number };

export async function migrationDiff(owner: string, repo: string): Promise<WorkflowDiff[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows`, {
    headers,
    next: { revalidate: 3600 },
  });
  if (res.status === 404) throw new Error("No .github/workflows folder found in this repo.");
  if (res.status === 403) throw new Error("GitHub rate limit hit. Add GITHUB_TOKEN to .env.local");
  if (!res.ok) throw new Error("GitHub error " + res.status);

  const files = ((await res.json()) as any[]).filter((f) => /\.ya?ml$/.test(f.name)).slice(0, 12);

  return Promise.all(
    files.map(async (f) => {
      const text = await (await fetch(f.download_url, { next: { revalidate: 3600 } })).text();
      const changes: Change[] = [];
      let skipped = 0;
      text.split("\n").forEach((l, i) => {
        if (!/runs-on:/.test(l)) return;
        const m = l.match(/^(\s*(?:-\s*)?runs-on:\s*)(['"]?)(ubuntu-latest|ubuntu-24\.04|ubuntu-22\.04)\2\s*$/);
        if (m) changes.push({ line: i + 1, before: l.trim(), after: l.trim().replace(m[3], TARGET_LABEL) });
        else skipped += 1; // matrix, expressions, macOS, Windows, custom labels: left alone on purpose
      });
      return { file: f.name as string, changes, skipped };
    })
  );
}
