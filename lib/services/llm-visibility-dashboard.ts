import type {
  LlmVisibilityBrand,
  LlmVisibilityByDateRow,
  LlmVisibilityDashboardResponse,
  LlmVisibilityPromptOption,
} from "@/lib/types/llm-visibility-dashboard";

type PerfRow = {
  brand_id: string;
  platform_id: string | null;
  prompt_id: string | null;
  visibility_score: number | null;
  rank_position: number | null;
  measured_at: string | null;
};

type PlatformRow = { id: string; name: string; display_name: string };

function rangeToDays(range: string): number {
  const n = parseInt(range.replace(/\D/g, ""), 10);
  if (n === 14 || n === 30 || n === 90) return n;
  return 7;
}

function formatPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "0";
  return value.toFixed(2);
}

function formatRank(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function llmVisibilityBrandKey(name: string): string {
  return name.replace(/[^\w\s-]/g, "").trim() || "brand";
}

export function buildLlmVisibilityDashboard(params: {
  range: string;
  brandRows: LlmVisibilityBrand[];
  perfRows: PerfRow[];
  platforms: PlatformRow[];
  prompts: LlmVisibilityPromptOption[];
  selectedBrandIds: string[];
  selectedModelSlugs: string[];
  selectedPromptIds: string[];
  focusPromptId?: string | null;
}): LlmVisibilityDashboardResponse {
  const days = rangeToDays(params.range);
  const fromMs = Date.now() - days * 86400_000;

  const brandMap = new Map(params.brandRows.map((b) => [b.id, b]));
  const activeBrands = params.selectedBrandIds
    .map((id) => brandMap.get(id))
    .filter((b): b is LlmVisibilityBrand => Boolean(b));

  const platById = new Map(params.platforms.map((p) => [p.id, p]));
  const modelSlugSet =
    params.selectedModelSlugs.length > 0 ? new Set(params.selectedModelSlugs) : null;
  const promptIdSet =
    params.selectedPromptIds.length > 0 ? new Set(params.selectedPromptIds) : null;

  const rows = params.perfRows.filter((r) => {
    if (!r.measured_at) return false;
    if (new Date(r.measured_at).getTime() < fromMs) return false;
    if (!params.selectedBrandIds.includes(r.brand_id)) return false;
    if (promptIdSet && r.prompt_id && !promptIdSet.has(r.prompt_id)) return false;
    if (modelSlugSet && r.platform_id) {
      const slug = platById.get(r.platform_id)?.name;
      if (!slug || !modelSlugSet.has(slug)) return false;
    }
    return true;
  });

  const empty = rows.length === 0;
  if (empty) {
    return {
      empty: true,
      chartData: [],
      brands: activeBrands,
      availableBrands: params.brandRows,
      availableModels: params.platforms.map((p) => ({
        slug: p.name,
        label: p.display_name || p.name,
      })),
      byDate: [],
      byModel: {},
      prompts: params.prompts,
      promptPerformance: null,
    };
  }

  const dayBrandVis = new Map<string, Map<string, number[]>>();
  const dayBrandRank = new Map<string, Map<string, number[]>>();
  const modelBrandVis = new Map<string, Map<string, number[]>>();
  const modelBrandRank = new Map<string, Map<string, number[]>>();

  const focusPromptId =
    params.focusPromptId ??
    (params.selectedPromptIds[0] || params.prompts[0]?.id || null);
  const dayPromptVis = new Map<string, Map<string, number[]>>();
  const dayPromptRank = new Map<string, Map<string, number[]>>();

  for (const r of rows) {
    const brand = brandMap.get(r.brand_id);
    if (!brand) continue;
    const bKey = llmVisibilityBrandKey(brand.name);
    const day = r.measured_at!.slice(0, 10);
    const plat = r.platform_id ? platById.get(r.platform_id) : null;
    const modelLabel = plat?.display_name ?? plat?.name ?? "Unknown";

    if (r.visibility_score != null) {
      const visMap = dayBrandVis.get(day) ?? new Map();
      const list = visMap.get(bKey) ?? [];
      list.push(Number(r.visibility_score));
      visMap.set(bKey, list);
      dayBrandVis.set(day, visMap);

      const mVis = modelBrandVis.get(modelLabel) ?? new Map();
      const mList = mVis.get(bKey) ?? [];
      mList.push(Number(r.visibility_score));
      mVis.set(bKey, mList);
      modelBrandVis.set(modelLabel, mVis);
    }

    if (r.rank_position != null) {
      const rankMap = dayBrandRank.get(day) ?? new Map();
      const rList = rankMap.get(bKey) ?? [];
      rList.push(Number(r.rank_position));
      rankMap.set(bKey, rList);
      dayBrandRank.set(day, rankMap);

      const mRank = modelBrandRank.get(modelLabel) ?? new Map();
      const mrList = mRank.get(bKey) ?? [];
      mrList.push(Number(r.rank_position));
      mRank.set(bKey, mrList);
      modelBrandRank.set(modelLabel, mRank);
    }

    if (focusPromptId && r.prompt_id === focusPromptId && plat) {
      if (r.visibility_score != null) {
        const pVis = dayPromptVis.get(day) ?? new Map();
        const pl = pVis.get(modelLabel) ?? [];
        pl.push(Number(r.visibility_score));
        pVis.set(modelLabel, pl);
        dayPromptVis.set(day, pVis);
      }
      if (r.rank_position != null) {
        const pRank = dayPromptRank.get(day) ?? new Map();
        const prl = pRank.get(modelLabel) ?? [];
        prl.push(Number(r.rank_position));
        pRank.set(modelLabel, prl);
        dayPromptRank.set(day, pRank);
      }
    }
  }

  const allDays = [...dayBrandVis.keys()].sort((a, b) => a.localeCompare(b));

  const chartData = allDays.map((date) => {
    const row: Record<string, string | number | null> = { date };
    for (const brand of activeBrands) {
      const key = llmVisibilityBrandKey(brand.name);
      const vis = avg(dayBrandVis.get(date)?.get(key) ?? []);
      const rank = avg(dayBrandRank.get(date)?.get(key) ?? []);
      row[key] = vis != null ? Number(vis.toFixed(2)) : null;
      row[`${key}_rank`] = rank != null ? Number(rank.toFixed(2)) : null;
    }
    return row;
  });

  const byDate: LlmVisibilityByDateRow[] = [...allDays].reverse().map((date) => {
    const row: LlmVisibilityByDateRow = { date };
    for (const brand of activeBrands) {
      const key = llmVisibilityBrandKey(brand.name);
      const vis = avg(dayBrandVis.get(date)?.get(key) ?? []);
      const rank = avg(dayBrandRank.get(date)?.get(key) ?? []);
      row[key] = formatPct(vis);
      row[`${key}_rank`] = formatRank(rank);
    }
    return row;
  });

  const byModel: Record<string, Record<string, string | number | null>> = {};
  const modelLabels = [...modelBrandVis.keys()].sort();
  for (const model of modelLabels) {
    byModel[model] = {};
    for (const brand of activeBrands) {
      const key = llmVisibilityBrandKey(brand.name);
      const vis = avg(modelBrandVis.get(model)?.get(key) ?? []);
      const rank = avg(modelBrandRank.get(model)?.get(key) ?? []);
      byModel[model][key] = formatPct(vis);
      byModel[model][`${key}_rank`] = formatRank(rank);
    }
  }

  let promptPerformance: LlmVisibilityDashboardResponse["promptPerformance"] = null;
  if (focusPromptId) {
    const promptMeta = params.prompts.find((p) => p.id === focusPromptId);
    const promptDays = [...dayPromptVis.keys()].sort((a, b) => a.localeCompare(b));
    promptPerformance = {
      promptId: focusPromptId,
      prompt: promptMeta?.prompt ?? focusPromptId,
      dates: [...promptDays].reverse().map((date) => {
        const row: Record<string, string | number | null> = {
          date: new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        };
        const platformsInDay = new Set([
          ...Array.from(dayPromptVis.get(date)?.keys() ?? []),
          ...Array.from(dayPromptRank.get(date)?.keys() ?? []),
        ]);
        for (const model of platformsInDay) {
          const vis = avg(dayPromptVis.get(date)?.get(model) ?? []);
          const rank = avg(dayPromptRank.get(date)?.get(model) ?? []);
          row[model] = formatPct(vis);
          row[`${model}_rank`] = formatRank(rank);
        }
        return row;
      }),
    };
  }

  return {
    empty: false,
    chartData,
    brands: activeBrands,
    availableBrands: params.brandRows,
    availableModels: params.platforms.map((p) => ({
      slug: p.name,
      label: p.display_name || p.name,
    })),
    byDate,
    byModel,
    prompts: params.prompts,
    promptPerformance,
  };
}
