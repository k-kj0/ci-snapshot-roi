import { ImageResponse } from "next/og";
import { analyzeRepo } from "@/lib/analyze";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { owner: string; repo: string } }) {
  const { owner, repo } = params;
  let headline = "CI Receipt";
  let sub = "Itemised CI waste and snapshot verdict";
  try {
    const r = await analyzeRepo(owner, repo);
    headline = `$${Math.round(r.totalWasted)}/mo`;
    sub = `of repeated CI setup in ${owner}/${repo} (estimate)`;
  } catch {}
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0c1110", color: "#edf4ef" }}>
        <div style={{ fontSize: 28, color: "#9ce6b3" }}>CI RECEIPT</div>
        <div style={{ fontSize: 130, fontWeight: 700, marginTop: 20 }}>{headline}</div>
        <div style={{ fontSize: 36, color: "#8d9d94", marginTop: 10 }}>{sub}</div>
        <div style={{ fontSize: 26, marginTop: 50, color: "#f2ca7d" }}>Is repeated setup eating your CI budget? Find out.</div>
      </div>
    ),
    size
  );
}
