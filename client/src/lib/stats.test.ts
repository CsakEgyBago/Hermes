import { describe, expect, it } from "vitest";
import { computeSourceContributions } from "./stats";
import type { RankedPoint, SourceText } from "../types";

const sources: SourceText[] = [
  { id: "s1", label: "Source One", text: "a", groupId: "s1", isMarkdown: false },
  { id: "s2", label: "Source Two", text: "b", groupId: "s2", isMarkdown: false },
  { id: "s3", label: "Source Three", text: "c", groupId: "s3", isMarkdown: false },
];

function point(sourceIds: string[]): RankedPoint {
  return {
    text: "point",
    weight: 50,
    rationale: "r",
    sourceQuotes: sourceIds.map((sourceId) => ({ sourceId, quote: "q" })),
  };
}

describe("computeSourceContributions", () => {
  it("counts how many points reference each source, sorted descending", () => {
    const points = [point(["s1", "s2"]), point(["s1"]), point(["s2"])];
    const result = computeSourceContributions(sources, points);

    expect(result).toEqual([
      { sourceId: "s1", label: "Source One", count: 2 },
      { sourceId: "s2", label: "Source Two", count: 2 },
      { sourceId: "s3", label: "Source Three", count: 0 },
    ]);
  });

  it("counts a source only once per point even with multiple quotes from it", () => {
    const withDuplicateQuotes: RankedPoint = {
      text: "point",
      weight: 50,
      rationale: "r",
      sourceQuotes: [
        { sourceId: "s1", quote: "a" },
        { sourceId: "s1", quote: "b" },
      ],
    };
    const result = computeSourceContributions(sources, [withDuplicateQuotes]);
    expect(result.find((r) => r.sourceId === "s1")?.count).toBe(1);
  });

  it("returns zero counts for all sources when there are no points", () => {
    const result = computeSourceContributions(sources, []);
    expect(result.every((r) => r.count === 0)).toBe(true);
  });
});
