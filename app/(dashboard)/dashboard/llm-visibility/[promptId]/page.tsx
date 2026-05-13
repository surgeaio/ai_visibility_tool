import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_PROMPTS, getDemoLlmPromptDetail } from "@/lib/demo/seed-data";

export default function LlmPromptDetailPage({ params }: { params: { promptId: string } }) {
  const prompt = DEMO_PROMPTS.find((p) => p.id === params.promptId);
  if (!prompt) notFound();

  const detail = getDemoLlmPromptDetail(params.promptId);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/llm-visibility" className="text-sm text-neutral-400 hover:text-white">
          ← Back to LLM visibility
        </Link>
        <h2 className="mt-3 text-lg font-semibold text-white">&ldquo;{prompt.text}&rdquo;</h2>
        <p className="mt-1 text-sm text-neutral-500">How this prompt performed across assistants (demo snapshot).</p>
      </div>

      <div className="space-y-6">
        {detail.platforms.map((row) => (
          <Card key={row.platform} className="border-[#262626] bg-[#111]">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base text-white">{row.platform}</CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {row.mentioned && row.position != null ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400">Position #{row.position}</span>
                  ) : row.mentioned ? (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-400">Mentioned</span>
                  ) : (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-red-400">Not mentioned</span>
                  )}
                  {row.sentimentScore != null && (
                    <span className="text-neutral-400">
                      Sentiment: <span className="text-white">{row.sentimentLabel}</span> ({row.sentimentScore})
                    </span>
                  )}
                  {!row.mentioned && <span className="text-neutral-400">Sentiment: —</span>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-300">
              {row.excerpt ? <p className="leading-relaxed">&ldquo;{row.excerpt}&rdquo;</p> : null}
              {row.gap ? (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-amber-200/90">
                  <span className="font-medium text-amber-400">Why? </span>
                  {row.gap}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-300">
            {detail.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
