export type QueryRow = {
  query: string;
  page_url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  country: string | null;
  device: string | null;
};

export type TableRow = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type KeywordTableRow = TableRow & {
  keyword: string;
  url?: string;
};

export type PageTableRow = TableRow & {
  url: string;
};

export type CountryRow = {
  country: string;
  clicks: number;
  impressions: number;
  share: number;
};

export type DeviceRow = {
  device: string;
  clicks: number;
  impressions: number;
  share: number;
};

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function weightedAveragePosition(rows: Array<{ position: number; impressions: number }>): number {
  let posSum = 0;
  let imp = 0;
  for (const r of rows) {
    const w = r.impressions ?? 0;
    if (w <= 0) continue;
    posSum += Number(r.position) * w;
    imp += w;
  }
  return imp > 0 ? posSum / imp : 0;
}

export function aggregateKeywords(rows: QueryRow[]): KeywordTableRow[] {
  const map = new Map<
    string,
    KeywordTableRow & { bestUrl: string; bestClicks: number; posSum: number; weight: number }
  >();
  for (const r of rows) {
    const cur = map.get(r.query) ?? {
      keyword: r.query,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      bestUrl: r.page_url,
      bestClicks: 0,
      posSum: 0,
      weight: 0,
    };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    const w = r.impressions || 0;
    cur.posSum += Number(r.position) * w;
    cur.weight += w;
    if (r.clicks > cur.bestClicks) {
      cur.bestClicks = r.clicks;
      cur.bestUrl = r.page_url;
    }
    map.set(r.query, cur);
  }
  return Array.from(map.values())
    .map(({ posSum, weight, bestUrl, ...row }) => ({
      keyword: row.keyword,
      clicks: row.clicks,
      impressions: row.impressions,
      position: weight > 0 ? posSum / weight : 0,
      url: bestUrl,
      ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

export function aggregatePages(rows: QueryRow[]): PageTableRow[] {
  const map = new Map<string, PageTableRow & { posSum: number; weight: number }>();
  for (const r of rows) {
    const cur = map.get(r.page_url) ?? {
      url: r.page_url,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      posSum: 0,
      weight: 0,
    };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    const w = r.impressions || 1;
    cur.posSum += Number(r.position) * w;
    cur.weight += w;
    map.set(r.page_url, cur);
  }
  return Array.from(map.values())
    .map(({ posSum, weight, ...p }) => ({
      ...p,
      position: weight > 0 ? posSum / weight : 0,
      ctr: p.impressions > 0 ? p.clicks / p.impressions : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

export function filterPage23Keywords(keywords: KeywordTableRow[]): KeywordTableRow[] {
  return keywords.filter((k) => k.position > 10 && k.position <= 30);
}

export function aggregateCountries(rows: QueryRow[]): CountryRow[] {
  const map = new Map<string, { clicks: number; impressions: number }>();
  for (const r of rows) {
    if (!r.country?.trim()) continue;
    const c = map.get(r.country) ?? { clicks: 0, impressions: 0 };
    c.clicks += r.clicks;
    c.impressions += r.impressions;
    map.set(r.country, c);
  }
  const total = Array.from(map.values()).reduce((s, v) => s + v.clicks, 0);
  return Array.from(map.entries())
    .map(([country, v]) => ({
      country,
      clicks: v.clicks,
      impressions: v.impressions,
      share: total > 0 ? v.clicks / total : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

export function aggregateDevices(rows: QueryRow[]): DeviceRow[] {
  const map = new Map<string, { clicks: number; impressions: number }>();
  for (const r of rows) {
    if (!r.device?.trim()) continue;
    const d = map.get(r.device) ?? { clicks: 0, impressions: 0 };
    d.clicks += r.clicks;
    d.impressions += r.impressions;
    map.set(r.device, d);
  }
  const total = Array.from(map.values()).reduce((s, v) => s + v.clicks, 0);
  return Array.from(map.entries())
    .map(([device, v]) => ({
      device: device.charAt(0).toUpperCase() + device.slice(1).toLowerCase(),
      clicks: v.clicks,
      impressions: v.impressions,
      share: total > 0 ? v.clicks / total : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}
