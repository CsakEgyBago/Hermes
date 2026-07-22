import { describe, expect, it } from "vitest";
import { findQuoteRanges, splitIntoSegments } from "./highlight";

describe("findQuoteRanges", () => {
  it("returns no ranges when there are no quotes", () => {
    expect(findQuoteRanges("hello world", [])).toEqual([]);
  });

  it("finds a single matching quote", () => {
    expect(findQuoteRanges("hello world", ["world"])).toEqual([{ start: 6, end: 11 }]);
  });

  it("ignores quotes that don't appear in the text", () => {
    expect(findQuoteRanges("hello world", ["missing"])).toEqual([]);
  });

  it("merges overlapping or adjacent ranges", () => {
    const ranges = findQuoteRanges("the quick brown fox", ["quick brown", "brown fox"]);
    expect(ranges).toEqual([{ start: 4, end: 19 }]);
  });
});

describe("splitIntoSegments", () => {
  it("returns the whole text as one non-highlighted segment with no quotes", () => {
    expect(splitIntoSegments("hello world", [])).toEqual([
      { text: "hello world", highlighted: false },
    ]);
  });

  it("splits around a matched quote", () => {
    expect(splitIntoSegments("hello world", ["world"])).toEqual([
      { text: "hello ", highlighted: false },
      { text: "world", highlighted: true },
    ]);
  });

  it("handles a quote at the very start of the text", () => {
    expect(splitIntoSegments("hello world", ["hello"])).toEqual([
      { text: "hello", highlighted: true },
      { text: " world", highlighted: false },
    ]);
  });
});
