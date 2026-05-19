type BrandMentionRow = {
  name?: string;
  position?: number;
  sentiment_score?: number;
};

export function metricsForCompetitor(
  competitorName: string,
  analyses: Array<{ all_brands_mentioned: unknown }>,
): {
  visibility: number | null;
  sentiment: number | null;
  position: number | null;
} {
  const normalized = competitorName.trim().toLowerCase();
  let mentionCount = 0;
  const positions: number[] = [];
  const sentiments: number[] = [];

  for (const row of analyses) {
    const brands = Array.isArray(row.all_brands_mentioned)
      ? (row.all_brands_mentioned as BrandMentionRow[])
      : [];
    const match = brands.find((b) => (b.name ?? "").trim().toLowerCase() === normalized);
    if (!match) continue;
    mentionCount += 1;
    if (match.position != null) positions.push(match.position);
    if (match.sentiment_score != null) sentiments.push(match.sentiment_score);
  }

  const total = analyses.length;
  return {
    visibility: total > 0 ? Math.round((mentionCount / total) * 100) : null,
    position:
      positions.length > 0
        ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
        : null,
    sentiment:
      sentiments.length > 0
        ? Math.round(sentiments.reduce((a, b) => a + b, 0) / sentiments.length)
        : null,
  };
}
