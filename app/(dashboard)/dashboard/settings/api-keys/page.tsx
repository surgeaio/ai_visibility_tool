import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApiKeysPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">API keys</h2>
        <p className="text-sm text-neutral-500">Provider access for LLM runs and audits.</p>
      </div>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">Managed by admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-400">
          <p>
            This platform uses shared admin keys. You do not need to add your own OpenAI, Anthropic, or
            Gemini keys — the admin configures them once in the hosting environment.
          </p>
          <p>
            All prompts and LLM visibility checks use those shared providers automatically.
          </p>
          <p className="text-neutral-500">
            Admins: set{" "}
            <code className="rounded bg-[#0a0a0a] px-1.5 py-0.5 text-xs">OPENAI_API_KEY</code>,{" "}
            <code className="rounded bg-[#0a0a0a] px-1.5 py-0.5 text-xs">ANTHROPIC_API_KEY</code>,{" "}
            <code className="rounded bg-[#0a0a0a] px-1.5 py-0.5 text-xs">GOOGLE_AI_API_KEY</code>, and
            optionally <code className="rounded bg-[#0a0a0a] px-1.5 py-0.5 text-xs">PERPLEXITY_API_KEY</code>{" "}
            in Vercel and Railway.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
