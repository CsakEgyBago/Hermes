import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ThinkingView } from "./ThinkingView";
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

describe("ThinkingView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when there is no meta", () => {
    const { container } = render(<ThinkingView meta={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reveals steps progressively rather than all at once", () => {
    render(<ThinkingView meta={statisticalMeta} />);

    expect(screen.queryByText(/Segmented into 8 sentences/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/Segmented into 8 sentences/)).toBeInTheDocument();
    expect(screen.getByText(/Finished in 12ms/)).toBeInTheDocument();
  });
});
