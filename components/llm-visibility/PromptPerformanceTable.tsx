"use client";

import { useMemo, useState } from "react";
import { ViewModeToggle, type VisibilityViewMode } from "@/components/llm-visibility/ViewModeToggle";
import type { LlmVisibilityPromptPerformance } from "@/lib/types/llm-visibility-dashboard";

export function PromptPerformanceTable({
  promptData,
  selectedPrompt,
  onSelectPrompt,
  prompts,
}: {
  promptData: LlmVisibilityPromptPerformance | null;
  selectedPrompt: string;
  onSelectPrompt?: (promptId: string) => void;
  prompts: Array<{ id: string; prompt: string }>;
}) {
  const [view, setView] = useState<VisibilityViewMode>("visibility");

  const modelColumns = useMemo(() => {
    if (!promptData?.dates?.length) return [];
    const keys = new Set<string>();
    for (const row of promptData.dates) {
      for (const k of Object.keys(row)) {
        if (k !== "date" && !k.endsWith("_rank")) keys.add(k);
      }
    }
    return [...keys].sort();
  }, [promptData]);

  return (
    <div className="mb-4 rounded-xl border border-[#262626] bg-[#111] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white">
            {selectedPrompt ? `${selectedPrompt}'s performance` : "Prompt performance"}
          </h3>
          {prompts.length > 1 && onSelectPrompt ? (
            <select
              className="mt-2 max-w-full rounded-md border border-[#262626] bg-[#0a0a0a] px-2 py-1 text-xs text-white"
              value={promptData?.promptId ?? ""}
              onChange={(e) => onSelectPrompt(e.target.value)}
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prompt.length > 60 ? `${p.prompt.slice(0, 60)}…` : p.prompt}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <ViewModeToggle view={view} onChange={setView} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#262626]">
              <th className="py-2 pr-4 text-left font-medium text-neutral-500">Date</th>
              {modelColumns.map((model) => (
                <th key={model} className="py-2 pr-4 text-left font-medium text-neutral-500">
                  {model}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!promptData?.dates?.length ? (
              <tr>
                <td
                  colSpan={Math.max(1, modelColumns.length + 1)}
                  className="py-8 text-center text-neutral-500"
                >
                  No prompt-level data for this selection.
                </td>
              </tr>
            ) : (
              promptData.dates.map((row, idx) => (
                <tr key={`${row.date}-${idx}`} className="border-b border-[#262626]/50">
                  <td className="py-3 text-neutral-400">{String(row.date)}</td>
                  {modelColumns.map((model) => (
                    <td key={model} className="py-3 text-neutral-200">
                      {view === "visibility"
                        ? `${row[model] ?? "0"}%`
                        : String(row[`${model}_rank`] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
