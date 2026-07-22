import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Summary } from "./Summary";
import type { RankedPoint } from "../types";

const points: RankedPoint[] = [
  { text: "Top point", weight: 90, rationale: "r", sourceQuotes: [] },
  { text: "Second point", weight: 50, rationale: "r", sourceQuotes: [] },
];

describe("Summary", () => {
  it("renders nothing when there are no points", () => {
    const { container } = render(<Summary points={[]} summary={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("headlines the top point's text", () => {
    render(<Summary points={points} summary={null} />);
    expect(screen.getByText("Top point")).toBeInTheDocument();
    expect(screen.getByText("Top result")).toBeInTheDocument();
  });

  it("renders the summary blurb when provided", () => {
    render(<Summary points={points} summary="Here is the synthesized takeaway." />);
    expect(screen.getByText("Here is the synthesized takeaway.")).toBeInTheDocument();
  });

  it("omits the blurb section when no summary is given", () => {
    render(<Summary points={points} summary={null} />);
    expect(screen.queryByText(/synthesized/)).not.toBeInTheDocument();
  });
});
