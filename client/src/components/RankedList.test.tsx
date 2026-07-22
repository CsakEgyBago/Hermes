import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RankedList } from "./RankedList";
import type { RankedPoint } from "../types";

const points: RankedPoint[] = [
  { text: "Point A", weight: 80, rationale: "Because A", sourceQuotes: [] },
  { text: "Point B", weight: 40, rationale: "Because B", sourceQuotes: [] },
];

describe("RankedList", () => {
  it("shows an empty-state message when there are no points", () => {
    render(<RankedList points={[]} selectedIndex={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/No results yet/)).toBeInTheDocument();
  });

  it("renders each point's text, weight, and rationale", () => {
    render(<RankedList points={points} selectedIndex={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Point A")).toBeInTheDocument();
    expect(screen.getByText("Because A")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked point's index", async () => {
    const onSelect = vi.fn();
    render(<RankedList points={points} selectedIndex={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("Point B"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
