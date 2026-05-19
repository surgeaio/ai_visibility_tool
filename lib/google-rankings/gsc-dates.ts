/** Format as YYYY-MM-DD (GSC Search Analytics API). */
export function formatGscDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * GSC dashboard ranges end on yesterday — today's data is not finalized.
 * `rangeDays` = 7 → yesterday minus 6 days through yesterday (7 days inclusive).
 */
export function getGscDateRange(rangeDays: number): { startDate: string; endDate: string } {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - 1);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (rangeDays - 1));

  return {
    startDate: formatGscDate(start),
    endDate: formatGscDate(end),
  };
}

/** Prior period of equal length immediately before `getGscDateRange`. */
export function getPreviousGscDateRange(rangeDays: number): { startDate: string; endDate: string } {
  const { startDate } = getGscDateRange(rangeDays);
  const currentStart = new Date(`${startDate}T00:00:00.000Z`);

  const prevEnd = new Date(currentStart);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (rangeDays - 1));

  return {
    startDate: formatGscDate(prevStart),
    endDate: formatGscDate(prevEnd),
  };
}

/** UI range keys → GSC day counts (30d label = 28 days in GSC). */
export function googleRankingsRangeToDays(range: "7d" | "30d" | "90d"): number {
  if (range === "7d") return 7;
  if (range === "30d") return 28;
  return 90;
}
