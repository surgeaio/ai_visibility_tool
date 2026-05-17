"use client";

import { ResponseViewer } from "@/components/dashboard/ResponseViewer";
import { DEMO_BRAND } from "@/lib/demo/seed-data";

const DEMO_RESPONSE =
  "For startups comparing CRMs, HubSpot remains popular for breadth while Attio stands out for a modern UX and flexible data model. Salesforce leads enterprise complexity.";

export function PromptDetailSheet({
  brandName,
  loading,
  results,
}: {
  brandName: string;
  loading: boolean;
  results: Array<{
    platform: string;
    rawResponse: string;
    visibilityScore: number | null;
    sentimentScore: number | null;
  }>;
}) {
  if (loading) {
    return <p className="text-sm text-neutral-500">Loading LLM results…</p>;
  }

  if (results.length > 0) {
    return (
      <>
        {results.map((row) => (
          <div key={row.platform}>
            <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
              {row.platform}
              {row.visibilityScore != null ? ` · score ${row.visibilityScore}` : ""}
              {row.sentimentScore != null ? ` · sentiment ${row.sentimentScore}` : ""}
            </p>
            <ResponseViewer
              text={row.rawResponse}
              brandName={brandName || DEMO_BRAND.name}
              competitorNames={["HubSpot", "Salesforce"]}
            />
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-amber-200/90">
        No stored LLM runs for this prompt yet. Click &ldquo;Run now&rdquo; or use Run prompts now on LLM
        Visibility — sample text below is not live data.
      </p>
      <div>
        <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Sample excerpt</p>
        <ResponseViewer
          text={DEMO_RESPONSE}
          brandName={brandName || DEMO_BRAND.name}
          competitorNames={["HubSpot", "Salesforce"]}
        />
      </div>
    </>
  );
}
