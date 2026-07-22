import type { RankedPoint, SourceText } from "../types";

export interface SourceContribution {
  sourceId: string;
  label: string;
  count: number;
}

export function computeSourceContributions(
  sources: SourceText[],
  points: RankedPoint[],
): SourceContribution[] {
  const counts = new Map<string, number>();
  for (const point of points) {
    const distinctSourceIds = new Set(point.sourceQuotes.map((q) => q.sourceId));
    for (const sourceId of distinctSourceIds) {
      counts.set(sourceId, (counts.get(sourceId) ?? 0) + 1);
    }
  }

  return sources
    .map((source) => ({
      sourceId: source.id,
      label: source.label,
      count: counts.get(source.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}
