"use client";

import { MultiSelectField } from "@/components/llm-visibility/MultiSelectField";
import type { LlmVisibilityBrand, LlmVisibilityPromptOption } from "@/lib/types/llm-visibility-dashboard";

const DATE_OPTIONS = [
  { value: "7d", label: "7 Days" },
  { value: "14d", label: "14 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
] as const;

export function LLMVisibilityFilters({
  dateRange,
  setDateRange,
  selectedBrandIds,
  setSelectedBrandIds,
  selectedModels,
  setSelectedModels,
  selectedPrompts,
  setSelectedPrompts,
  availableBrands,
  availableModels,
  prompts,
}: {
  dateRange: string;
  setDateRange: (v: string) => void;
  selectedBrandIds: string[];
  setSelectedBrandIds: (v: string[]) => void;
  selectedModels: string[];
  setSelectedModels: (v: string[]) => void;
  selectedPrompts: string[];
  setSelectedPrompts: (v: string[]) => void;
  availableBrands: LlmVisibilityBrand[];
  availableModels: Array<{ slug: string; label: string }>;
  prompts: LlmVisibilityPromptOption[];
}) {
  return (
    <div className="mb-6 rounded-xl border border-[#262626] bg-[#111] p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MultiSelectField
          label="Brands"
          options={availableBrands.map((b) => ({ value: b.id, label: b.name }))}
          selected={selectedBrandIds}
          onChange={setSelectedBrandIds}
        />
        <MultiSelectField
          label="AI Models"
          options={availableModels.map((m) => ({ value: m.slug, label: m.label }))}
          selected={selectedModels}
          onChange={setSelectedModels}
        />
        <MultiSelectField
          label="Prompts"
          options={prompts.map((p) => ({
            value: p.id,
            label: p.prompt.length > 48 ? `${p.prompt.slice(0, 48)}…` : p.prompt,
          }))}
          selected={selectedPrompts}
          onChange={setSelectedPrompts}
        />
        <div>
          <label className="text-xs font-medium text-neutral-500">Date Range</label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-[#262626] bg-[#0a0a0a] px-3 text-sm text-white"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            {DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
