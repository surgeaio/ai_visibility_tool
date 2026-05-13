import Link from "next/link";
import { PlatformComparisonChart } from "@/components/charts/PlatformComparisonChart";
import { VisibilityTrendChart } from "@/components/charts/VisibilityTrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_COMPETITORS, DEMO_LLM_TREND, getDemoCompetitorProfile } from "@/lib/demo/seed-data";

export default function CompetitorDetailPage({ params }: { params: { id: string } }) {
  const competitor = DEMO_COMPETITORS.find((c) => c.id === params.id);
  const displayName = competitor?.name ?? "Saved competitor";
  const profile = getDemoCompetitorProfile(params.id);

  const rivalScore = competitor
    ? Math.min(98, Math.round(competitor.visibility + competitor.sentiment / 3))
    : Math.round(profile.authority);

  const compareRow = [
    { name: "You (demo)", score: 72 },
    { name: displayName, score: rivalScore },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/competitors" className="text-sm text-neutral-400 hover:text-white">
          ← Back to competitors
        </Link>
        <h2 className="mt-3 text-lg font-semibold text-white">{displayName}</h2>
        <p className="mt-1 text-sm text-neutral-500">Deep profile using demo heuristics—not a live crawl yet.</p>
      </div>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">Quick stats</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm text-neutral-300">
          <span>
            Authority: <span className="font-mono text-white">{profile.authority}/100</span>
          </span>
          <span>
            Content pages: <span className="font-mono text-white">{profile.contentPages.toLocaleString()}</span>
          </span>
          <span>
            Backlinks (estimate): <span className="font-mono text-white">{profile.backlinks}</span>
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-[#262626] bg-[#111] p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">LLM visibility vs you</CardTitle>
          </CardHeader>
          <PlatformComparisonChart data={compareRow} />
        </Card>
        <Card className="border-[#262626] bg-[#111] p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Market trend (demo)</CardTitle>
            <p className="text-sm text-neutral-500">Same timeline as the LLM dashboard for easy comparison.</p>
          </CardHeader>
          <VisibilityTrendChart data={DEMO_LLM_TREND} />
        </Card>
      </div>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">Their strengths</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-300">
            {profile.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">How they show up in LLMs</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-300">
            {profile.llmBullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {profile.topPages.length > 0 ? (
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader>
            <CardTitle className="text-base text-white">Top pages (illustrative)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
                <tr>
                  <th className="p-3">Path</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Traffic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {profile.topPages.map((p) => (
                  <tr key={p.path}>
                    <td className="p-3 font-mono text-neutral-200">
                      {displayName.toLowerCase().replace(/\s+/g, "")}
                      .com
                      {p.path}
                    </td>
                    <td className="p-3 font-mono">{p.position}</td>
                    <td className="p-3 text-neutral-400">{p.traffic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">What you can learn</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-300">
            {profile.learnings.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
