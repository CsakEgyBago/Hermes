import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsPanel } from "./StatsPanel";
import type { AnalyzeMeta, RankedPoint, SourceText } from "../types";

const sources: SourceText[] = [
  { id: "s1", label: "Source One", text: "a", groupId: "s1", isMarkdown: false },
  { id: "s2", label: "Source Two", text: "b", groupId: "s2", isMarkdown: false },
];

const points: RankedPoint[] = [
  {
    text: "First point",
    weight: 80,
    rationale: "r",
    sourceQuotes: [{ sourceId: "s1", quote: "a" }],
  },
  {
    text: "Second point",
    weight: 40,
    rationale: "r",
    sourceQuotes: [{ sourceId: "s2", quote: "b" }],
  },
];

const statisticalMeta: AnalyzeMeta = {
  mode: "statistical",
  sourceCount: 2,
  groupCount: 1,
  wordCount: 10,
  durationMs: 5,
  sentenceCount: 6,
  edgeCount: 3,
  iterations: 12,
  converged: true,
  similarityMethod: "jaccard",
};

const aiMeta: AnalyzeMeta = {
  mode: "ai",
  sourceCount: 2,
  groupCount: 1,
  wordCount: 10,
  durationMs: 900,
};

describe("StatsPanel", () => {
  it("renders nothing when there is no meta", () => {
    const { container } = render(<StatsPanel sources={sources} points={[]} meta={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows corpus and timing stats", () => {
    render(<StatsPanel sources={sources} points={points} meta={statisticalMeta} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5ms")).toBeInTheDocument();
  });

  it("shows algorithm-internal stats only for statistical mode", () => {
    const { rerender } = render(
      <StatsPanel sources={sources} points={points} meta={statisticalMeta} />,
    );
    expect(screen.getByText("Sentences")).toBeInTheDocument();
    expect(screen.getByText("Converged")).toBeInTheDocument();

    rerender(<StatsPanel sources={sources} points={points} meta={aiMeta} />);
    expect(screen.queryByText("Sentences")).not.toBeInTheDocument();
    expect(screen.queryByText("Converged")).not.toBeInTheDocument();
  });

  it("renders one weight-distribution bar per point, scaled to the fixed 0-100 range", () => {
    render(<StatsPanel sources={sources} points={points} meta={statisticalMeta} />);
    expect(screen.getByText("First point")).toBeInTheDocument();
    expect(screen.getByText("Second point")).toBeInTheDocument();

    const bars = screen.getAllByText(/^Weight: /);
    expect(bars.map((b) => b.textContent)).toEqual(["Weight: 80", "Weight: 40"]);
  });

  it("renders per-source contribution bars sorted by count descending", () => {
    render(<StatsPanel sources={sources} points={points} meta={statisticalMeta} />);
    const labels = screen.getAllByTitle(/Source (One|Two)/).map((el) => el.textContent);
    expect(labels).toEqual(["Source One", "Source Two"]);
  });
});
