/** Integer clicks like GSC (94). */
export function formatGscClicks(n: number): string {
  return Math.round(n).toLocaleString();
}

/** Impressions like GSC UI: 21k, 1.2M */
export function formatGscImpressions(n: number): string {
  const v = Math.round(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return v.toLocaleString();
}

/** CTR as decimal 0–1 → "0.4%" */
export function formatGscCtr(ctrDecimal: number): string {
  return `${(ctrDecimal * 100).toFixed(1)}%`;
}

/** Average position with one decimal (13.9). */
export function formatGscPosition(position: number): string {
  return (Math.round(position * 10) / 10).toFixed(1);
}

export function roundGscCtrPercent(ctrDecimal: number): number {
  return Math.round(ctrDecimal * 1000) / 10;
}

export function roundGscPosition(position: number): number {
  return Math.round(position * 10) / 10;
}
