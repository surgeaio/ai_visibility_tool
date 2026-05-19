"use client";

import { useMemo, useState } from "react";
import { ViewModeToggle, type VisibilityViewMode } from "@/components/llm-visibility/ViewModeToggle";
import type { LlmVisibilityBrand, LlmVisibilityByModelData } from "@/lib/types/llm-visibility-dashboard";
import { llmVisibilityBrandKey } from "@/lib/services/llm-visibility-dashboard";

export function BrandPerformanceByModel({
  data,
  brands,
}: {
  data: LlmVisibilityByModelData;
  brands: LlmVisibilityBrand[];
}) {
  const [view, setView] = useState<VisibilityViewMode>("visibility");
  const models = useMemo(() => Object.keys(data).sort(), [data]);

  return (
    <div className="mb-4 rounded-xl border border-[#262626] bg-[#111] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-white">Brand&apos;s performance by AI model</h3>
        <ViewModeToggle view={view} onChange={setView} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#262626]">
              <th className="py-2 pr-4 text-left font-medium text-neutral-500">AI Model</th>
              {brands.map((brand) => (
                <th key={brand.id} className="py-2 pr-4 text-left font-medium text-neutral-500">
                  {brand.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr>
                <td colSpan={brands.length + 1} className="py-8 text-center text-neutral-500">
                  No model breakdown available.
                </td>
              </tr>
            ) : (
              models.map((model) => (
                <tr key={model} className="border-b border-[#262626]/50">
                  <td className="py-3 text-neutral-200">{model}</td>
                  {brands.map((brand) => {
                    const key = llmVisibilityBrandKey(brand.name);
                    const cell = data[model];
                    return (
                      <td key={brand.id} className="py-3 text-neutral-200">
                        {view === "visibility"
                          ? `${cell?.[key] ?? "0"}%`
                          : String(cell?.[`${key}_rank`] ?? "—")}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
