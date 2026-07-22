import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeStatistical,
  buildSummary,
  jaccardSimilarity,
  splitSentences,
  tokenize,
} from "./statistical.js";
import type { RankedPoint, SourceText } from "./types.js";

test("tokenize lowercases, strips punctuation, and drops stopwords/short words", () => {
  assert.deepEqual(tokenize("The Server Crashed, due to a memory-leak!"), [
    "server",
    "crashed",
    "due",
    "memory",
    "leak",
  ]);
});

test("splitSentences splits on sentence punctuation and trims fragments", () => {
  assert.deepEqual(splitSentences("First sentence. Second sentence! Third one?"), [
    "First sentence.",
    "Second sentence!",
    "Third one?",
  ]);
});

test("splitSentences filters out fragments shorter than the minimum length", () => {
  assert.deepEqual(splitSentences("A. This is a real sentence."), ["This is a real sentence."]);
});

test("splitSentences strips heading lines instead of gluing them onto the next sentence", () => {
  const text = "# Product Update\n\nThe migration is now complete.\n\nMore details follow.";
  assert.deepEqual(splitSentences(text), [
    "The migration is now complete.",
    "More details follow.",
  ]);
});

test("splitSentences produces an identical sentence across sections with different headings", () => {
  const a = splitSentences("# Engineering Update\n\nThe migration is now complete.");
  const b = splitSentences("# Product Update\n\nThe migration is now complete.");
  assert.deepEqual(a, ["The migration is now complete."]);
  assert.deepEqual(a, b);
});

test("jaccardSimilarity is 1 for identical sets, 0 for disjoint sets", () => {
  assert.equal(jaccardSimilarity(["a", "b"], ["a", "b"]), 1);
  assert.equal(jaccardSimilarity(["a", "b"], ["c", "d"]), 0);
  assert.equal(jaccardSimilarity(["a", "b"], []), 0);
});

test("jaccardSimilarity is between 0 and 1 for partial overlap", () => {
  const sim = jaccardSimilarity(["a", "b", "c"], ["b", "c", "d"]);
  assert.ok(sim > 0 && sim < 1);
});

test("buildSummary reports no points found for an empty list", () => {
  assert.match(buildSummary([]), /No significant points were found/);
});

test("buildSummary headlines the top point and its rationale", () => {
  const points: RankedPoint[] = [
    { text: "Top point", weight: 90, rationale: "corroborated widely", sourceQuotes: [] },
  ];
  const summary = buildSummary(points);
  assert.match(summary, /The most important point is: "Top point" \(corroborated widely\)/);
});

test("buildSummary names up to two other notable points", () => {
  const points: RankedPoint[] = [
    { text: "Top point", weight: 90, rationale: "r", sourceQuotes: [] },
    { text: "Second point", weight: 60, rationale: "r", sourceQuotes: [] },
    { text: "Third point", weight: 40, rationale: "r", sourceQuotes: [] },
    { text: "Fourth point", weight: 20, rationale: "r", sourceQuotes: [] },
  ];
  const summary = buildSummary(points);
  assert.match(summary, /Other notable points include "Second point" and "Third point"/);
  assert.doesNotMatch(summary, /Fourth point/);
});

test("analyzeStatistical returns nothing for sources with no sentences", () => {
  const result = analyzeStatistical(undefined, [{ id: "s1", label: "S1", text: "" }], {
    speed: "fast",
    topicWeight: 0.5,
  });
  assert.deepEqual(result.points, []);
});

test("a single source still ranks its sentences by internal centrality, not a flat tie", () => {
  const sources: SourceText[] = [
    {
      id: "s1",
      label: "S1",
      text: "The database migration finished ahead of schedule. Weather was unusually warm this week. In conclusion, the database migration finished ahead of schedule. The office snack budget was reduced by ten percent.",
    },
  ];

  const result = analyzeStatistical(undefined, sources, { speed: "balanced", topicWeight: 0.5 });

  // Regression guard: the old code compared every sentence's groupId (which
  // defaults to its own sourceId), so with one source every pair shared a
  // groupId and no edges were ever created.
  assert.ok(result.meta.edgeCount > 0, "expected within-source sentences to connect");

  assert.match(result.points[0].text, /database migration finished ahead of schedule/);
  assert.ok(
    result.points[0].weight > result.points.at(-1)!.weight,
    "expected the internally-corroborated sentence to outrank the isolated ones, not tie with them",
  );
});

test("a sentence corroborated across multiple sources outranks a one-off mention", () => {
  const sources: SourceText[] = [
    {
      id: "s1",
      label: "S1",
      text: "The server crashed due to a memory leak. Only source one mentions the weather today.",
    },
    {
      id: "s2",
      label: "S2",
      text: "The server crashed due to a memory leak. Only source two talks about a coffee order.",
    },
    {
      id: "s3",
      label: "S3",
      text: "The server crashed due to a memory leak. Only source three discusses a birthday party.",
    },
  ];

  const result = analyzeStatistical(undefined, sources, { speed: "balanced", topicWeight: 0.5 });

  assert.ok(result.points.length > 0);
  const top = result.points[0];
  assert.equal(top.text, "The server crashed due to a memory leak.");
  assert.equal(top.sourceQuotes.length, 3);
  assert.match(top.rationale, /Corroborated across 3 sources/);
});

test("source quotes are verbatim substrings of their originating source text", () => {
  const sources: SourceText[] = [
    { id: "s1", label: "S1", text: "The server crashed due to a memory leak. Weather was nice." },
    { id: "s2", label: "S2", text: "The server crashed due to a memory leak. Coffee was cold." },
  ];

  const result = analyzeStatistical(undefined, sources, { speed: "fast", topicWeight: 0.5 });
  const sourcesById = new Map(sources.map((s) => [s.id, s.text]));

  for (const point of result.points) {
    for (const quote of point.sourceQuotes) {
      const sourceText = sourcesById.get(quote.sourceId);
      assert.ok(sourceText, `unknown sourceId ${quote.sourceId}`);
      assert.ok(sourceText!.includes(quote.quote), `quote not found verbatim in ${quote.sourceId}`);
    }
  }
});

test("weights are within 0-100 and sorted descending", () => {
  const sources: SourceText[] = [
    { id: "s1", label: "S1", text: "Alpha point here. Beta point here. Gamma point here." },
    { id: "s2", label: "S2", text: "Alpha point here. Delta point here." },
  ];
  const result = analyzeStatistical(undefined, sources, { speed: "balanced", topicWeight: 0.5 });

  for (const point of result.points) {
    assert.ok(point.weight >= 0 && point.weight <= 100);
  }
  for (let i = 1; i < result.points.length; i++) {
    assert.ok(result.points[i - 1].weight >= result.points[i].weight);
  }
});

test("tied ranks (degenerate normalization) still produce a sensible weight, not 0", () => {
  const sources: SourceText[] = [
    { id: "s1", label: "S1", text: "The server crashed due to a memory leak. Extra detail one." },
    { id: "s2", label: "S2", text: "The server crashed due to a memory leak. Extra detail two." },
  ];
  const result = analyzeStatistical(undefined, sources, { speed: "fast", topicWeight: 0.5 });

  assert.ok(result.points.length > 0);
  for (const point of result.points) {
    assert.equal(point.weight, 100);
  }
});

test("a low topic weight favors the corroborated sentence over a topic-only mention", () => {
  const sources: SourceText[] = [
    { id: "s1", label: "S1", text: "The picnic was rescheduled due to rain." },
    {
      id: "s2",
      label: "S2",
      text: "The picnic was rescheduled due to rain. A rare database outage occurred at midnight.",
    },
  ];

  const result = analyzeStatistical("database outage", sources, {
    speed: "precise",
    topicWeight: 0,
  });

  assert.equal(result.points[0].text, "The picnic was rescheduled due to rain.");
});

test("a high topic weight favors the topic-relevant sentence over mere corroboration", () => {
  const sources: SourceText[] = [
    { id: "s1", label: "S1", text: "The picnic was rescheduled due to rain." },
    {
      id: "s2",
      label: "S2",
      text: "The picnic was rescheduled due to rain. A rare database outage occurred at midnight.",
    },
  ];

  const result = analyzeStatistical("database outage", sources, {
    speed: "precise",
    topicWeight: 1,
  });

  assert.equal(result.points[0].text, "A rare database outage occurred at midnight.");
});

test("a real multi-heading file, split into sections, doesn't self-corroborate until an independent source agrees", () => {
  const splitPieces: SourceText[] = [
    {
      id: "p1",
      label: "Report — Engineering Update",
      text: "# Engineering Update\n\nThe migration to the new billing system is now complete.\n\nTest coverage increased this quarter.",
      groupId: "report",
    },
    {
      id: "p2",
      label: "Report — Product Update",
      text: "# Product Update\n\nThe migration to the new billing system is now complete.\n\nThree new features shipped.",
      groupId: "report",
    },
    {
      id: "p3",
      label: "Report — Support Update",
      text: "# Support Update\n\nThe migration to the new billing system is now complete.\n\nTicket volume dropped.",
      groupId: "report",
    },
  ];

  const withoutIndependentSource = analyzeStatistical(undefined, splitPieces, {
    speed: "balanced",
    topicWeight: 0.5,
  });
  const migrationPoint = withoutIndependentSource.points.find((p) =>
    p.text.includes("migration to the new billing system"),
  );
  assert.ok(migrationPoint);
  assert.equal(migrationPoint.rationale, "Mentioned in 1 source");

  const withIndependentSource = analyzeStatistical(
    undefined,
    [
      ...splitPieces,
      {
        id: "independent",
        label: "Finance Note",
        text: "The migration to the new billing system is now complete. Finance confirmed the reconciliation.",
      },
    ],
    { speed: "balanced", topicWeight: 0.5 },
  );
  const migrationPoint2 = withIndependentSource.points.find((p) =>
    p.text.includes("migration to the new billing system"),
  );
  assert.ok(migrationPoint2);
  assert.match(migrationPoint2.rationale, /Corroborated across 2 sources/);
});

test("pieces sharing a groupId (an autosplit file) don't corroborate each other", () => {
  const sources: SourceText[] = [
    { id: "s1a", label: "S1a", text: "The server crashed due to a memory leak.", groupId: "file1" },
    { id: "s1b", label: "S1b", text: "The server crashed due to a memory leak.", groupId: "file1" },
  ];
  const result = analyzeStatistical(undefined, sources, { speed: "fast", topicWeight: 0.5 });

  assert.equal(result.points.length, 1);
  assert.equal(result.points[0].rationale, "Mentioned in 1 source");
  assert.equal(result.meta.edgeCount, 0);
});

test("a group only corroborates with a genuinely different group, not its own siblings", () => {
  const sources: SourceText[] = [
    { id: "s1a", label: "S1a", text: "The server crashed due to a memory leak.", groupId: "file1" },
    { id: "s1b", label: "S1b", text: "The server crashed due to a memory leak.", groupId: "file1" },
    { id: "s2", label: "S2", text: "The server crashed due to a memory leak." },
  ];
  const result = analyzeStatistical(undefined, sources, { speed: "fast", topicWeight: 0.5 });

  assert.equal(result.points.length, 1);
  assert.match(result.points[0].rationale, /Corroborated across 2 sources/);
  assert.equal(result.meta.edgeCount, 2);
});

test("meta reports sane sentence/edge/iteration/similarity-method info", () => {
  const sources: SourceText[] = [
    { id: "s1", label: "S1", text: "Alpha point here. Beta point here." },
    { id: "s2", label: "S2", text: "Alpha point here. Gamma point here." },
  ];

  const fast = analyzeStatistical(undefined, sources, { speed: "fast", topicWeight: 0.5 });
  assert.equal(fast.meta.sentenceCount, 4);
  assert.equal(fast.meta.similarityMethod, "jaccard");
  assert.ok(fast.meta.iterations >= 1);
  assert.equal(typeof fast.meta.converged, "boolean");
  assert.ok(fast.meta.edgeCount >= 0);

  const precise = analyzeStatistical(undefined, sources, { speed: "precise", topicWeight: 0.5 });
  assert.equal(precise.meta.similarityMethod, "tfidf-cosine");
});

test("analyzeStatistical reports meta even when there are no sentences", () => {
  const result = analyzeStatistical(undefined, [{ id: "s1", label: "S1", text: "" }], {
    speed: "balanced",
    topicWeight: 0.5,
  });
  assert.deepEqual(result.meta, {
    sentenceCount: 0,
    edgeCount: 0,
    iterations: 0,
    converged: true,
    similarityMethod: "jaccard",
  });
});

test("all speed presets produce valid output for the same input", () => {
  const sources: SourceText[] = [
    { id: "s1", label: "S1", text: "Alpha point here. Beta point here." },
    { id: "s2", label: "S2", text: "Alpha point here. Gamma point here." },
  ];

  for (const speed of ["fast", "balanced", "precise"] as const) {
    const result = analyzeStatistical(undefined, sources, { speed, topicWeight: 0.5 });
    assert.ok(result.points.length > 0, `expected points for speed=${speed}`);
  }
});
