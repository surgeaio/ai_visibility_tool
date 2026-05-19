"use client";

import { useState } from "react";
import { ViewModeToggle, type VisibilityViewMode } from "@/components/llm-visibility/ViewModeToggle";
import type { LlmVisibilityBrand, LlmVisibilityByDateRow } from "@/lib/types/llm-visibility-dashboard";
import { llmVisibilityBrandKey } from "@/lib/services/llm-visibility-dashboard";

export function BrandPerformanceByDate({
  data,
  brands,
}: {
  data: LlmVisibilityByDateRow[];
  brands: LlmVisibilityBrand[];
}) {
  const [view, setView] = useState<VisibilityViewMode>("visibility");

  return (
    <div className="mb-4 rounded-xl border border-[#262626] bg-[#111] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-white">Brand&apos;s performance by date</h3>
        <ViewModeToggle view={view} onChange={setView} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#262626]">
              <th className="py-2 pr-4 text-left font-medium text-neutral-500">Date</th>
              {brands.map((brand) => (
                <th key={brand.id} className="py-2 pr-4 text-left font-medium text-neutral-500">
                  {brand.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={brands.length + 1} className="py-8 text-center text-neutral-500">
                  No performance data for this range.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={String(row.date)} className="border-b border-[#262626]/50">
                  <td className="py-3 text-neutral-400">
                    {new Date(String(row.date)).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  {brands.map((brand) => {
                    const key = llmVisibilityBrandKey(brand.name);
                    return (
                      <td key={brand.id} className="py-3 text-neutral-200">
                        {view === "visibility"
                          ? `${row[key] ?? "0"}%`
                          : String(row[`${key}_rank`] ?? "—")}
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
