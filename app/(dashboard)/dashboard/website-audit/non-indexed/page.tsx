import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_NON_INDEXED_PAGES, DEMO_WEBSITE_AUDIT_SUMMARY } from "@/lib/demo/seed-data";

export default function NonIndexedPagesPage() {
  const count = DEMO_WEBSITE_AUDIT_SUMMARY.notIndexed;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/website-audit" className="text-sm text-neutral-400 hover:text-white">
          ← Back to website audit
        </Link>
        <h2 className="mt-3 text-lg font-semibold text-white">Non-indexed pages ({count})</h2>
        <p className="mt-1 text-sm text-neutral-500">
          These URLs are blocked, thin, duplicated, or not strong enough for Google to keep in the main index (demo
          examples).
        </p>
      </div>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base text-white">URL list</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" type="button" disabled title="Coming soon">
              Request indexing
            </Button>
            <Button size="sm" variant="secondary" type="button" disabled title="Coming soon">
              Export list
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {DEMO_NON_INDEXED_PAGES.map((p) => (
            <div key={p.url} className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
              <p className="font-mono text-sm text-white">{p.url}</p>
              <p className="mt-1 text-sm text-neutral-400">
                <span className="text-neutral-500">Reason:</span> {p.reason}
              </p>
              <p className="mt-2 text-sm text-amber-200/90">
                <span className="font-medium text-amber-400">Why it matters: </span>
                {p.hint}
              </p>
              <Button variant="link" className="mt-2 h-auto px-0 text-xs text-sky-400" type="button" disabled>
                Fix suggestion (soon)
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
