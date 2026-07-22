import { describe, expect, it } from "vitest";
import { buildThinkingSteps } from "./thinking";
import type { AnalyzeMeta } from "../types";

const statisticalMeta: AnalyzeMeta = {
  mode: "statistical",
  sourceCount: 2,
  groupCount: 2,
  wordCount: 40,
  durationMs: 12,
  sentenceCount: 8,
  edgeCount: 5,
  iterations: 30,
  converged: true,
  similarityMethod: "jaccard",
};

const aiMeta: AnalyzeMeta = {
  mode: "ai",
  sourceCount: 3,
  groupCount: 3,
  wordCount: 120,
  durationMs: 900,
};

describe("buildThinkingSteps", () => {
  it("describes the statistical pipeline with real numbers", () => {
    const steps = buildThinkingSteps(statisticalMeta);
    expect(steps[0]).toMatch(/2 sources.*2 distinct files.*40 words/);
    expect(steps).toContainEqual(expect.stringMatching(/Segmented into 8 sentences/));
    expect(steps).toContainEqual(expect.stringMatching(/5 edges.*word-overlap/));
    expect(steps).toContainEqual(expect.stringMatching(/30 ranking passes.*converged/));
    expect(steps.at(-1)).toBe("Finished in 12ms");
  });

  it("describes the AI pipeline", () => {
    const steps = buildThinkingSteps(aiMeta);
    expect(steps).toContainEqual(expect.stringMatching(/Sent the sources to Claude/));
    expect(steps).toContainEqual(expect.stringMatching(/Received ranked points/));
    expect(steps.at(-1)).toBe("Finished in 900ms");
  });
});
