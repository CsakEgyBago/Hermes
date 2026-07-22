import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcePanel } from "./SourcePanel";
import type { RankedPoint, SourceText } from "../types";

const plainSource: SourceText = {
  id: "s1",
  label: "Plain Source",
  text: "The server crashed due to a memory leak.",
  groupId: "s1",
  isMarkdown: false,
};

const markdownSource: SourceText = {
  id: "s2",
  label: "Markdown Source",
  text: "# Heading\n\nThe server crashed due to a memory leak.",
  groupId: "s2",
  isMarkdown: true,
};

describe("SourcePanel", () => {
  it("shows raw text directly for a non-Markdown source with no Preview/Raw toggle", () => {
    render(<SourcePanel sources={[plainSource]} selectedPoint={null} />);
    expect(screen.getByText(/The server crashed due to a memory leak\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preview/i })).not.toBeInTheDocument();
  });

  it("defaults a Markdown source to rendered Preview mode", () => {
    render(<SourcePanel sources={[markdownSource]} selectedPoint={null} />);
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
  });

  it("switches to Raw mode and shows the literal Markdown syntax", async () => {
    render(<SourcePanel sources={[markdownSource]} selectedPoint={null} />);
    await userEvent.click(screen.getByRole("button", { name: /^raw$/i }));
    expect(screen.getByText(/# Heading/)).toBeInTheDocument();
  });

  it("auto-switches to Raw and highlights the quote when a matching point is selected", () => {
    const point: RankedPoint = {
      text: "The server crashed due to a memory leak.",
      weight: 90,
      rationale: "r",
      sourceQuotes: [{ sourceId: "s2", quote: "The server crashed due to a memory leak." }],
    };
    render(<SourcePanel sources={[markdownSource]} selectedPoint={point} />);

    expect(screen.getByRole("button", { name: /^raw$/i })).toHaveClass("bg-indigo-600");
    expect(screen.getByText("The server crashed due to a memory leak.").tagName).toBe("MARK");
  });
});
