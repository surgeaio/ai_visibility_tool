"use client";

import type { UserApiKeyListItem } from "@/lib/repositories/user-api-keys.repo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestKeyButton } from "@/components/settings/api-keys/TestKeyButton";

const PROVIDER_LABEL: Record<string, string> = {
  openai: "ChatGPT (OpenAI)",
  anthropic: "Claude (Anthropic)",
  gemini: "Gemini (Google)",
  google_search_console: "Google Search Console",
  google_analytics: "Google Analytics",
};

function statusBadge(status: UserApiKeyListItem["testStatus"]) {
  if (status === "working") return <Badge className="bg-emerald-950 text-emerald-300">Working</Badge>;
  if (status === "failed") return <Badge className="bg-red-950 text-red-300">Failed</Badge>;
  return <Badge variant="secondary">Not tested</Badge>;
}

export function ApiKeyList({
  keys,
  onDelete,
}: {
  keys: UserApiKeyListItem[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#111]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[#262626] bg-[#0a0a0a] text-xs uppercase text-neutral-500">
          <tr>
            <th className="p-4 font-medium">Provider</th>
            <th className="p-4 font-medium">Name</th>
            <th className="p-4 font-medium">Preview</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#262626]">
          {keys.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-neutral-500">
                No API keys yet. Add one to run live checks (optional in demo mode).
              </td>
            </tr>
          ) : (
            keys.map((k) => (
              <tr key={k.id} className="hover:bg-[#1a1a1a]/50">
                <td className="p-4 font-medium text-neutral-200">
                  {PROVIDER_LABEL[k.provider] ?? k.provider}
                </td>
                <td className="p-4 text-neutral-300">{k.keyName}</td>
                <td className="p-4 font-mono text-xs text-neutral-500">{k.keyPreview}</td>
                <td className="p-4">{statusBadge(k.testStatus)}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <TestKeyButton id={k.id} />
                    <Button type="button" variant="ghost" size="sm" className="text-red-400" onClick={() => onDelete(k.id)}>
                      Remove
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
