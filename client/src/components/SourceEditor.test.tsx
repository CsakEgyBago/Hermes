import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SourceEditor } from "./SourceEditor";
import type { SourceText } from "../types";

function Wrapper({ onAnalyze }: { onAnalyze: () => void }) {
  const [topic, setTopic] = useState("");
  const [sources, setSources] = useState<SourceText[]>([
    { id: "s0", label: "Source 1", text: "", groupId: "s0", isMarkdown: false },
  ]);
  return (
    <SourceEditor
      topic={topic}
      onTopicChange={setTopic}
      sources={sources}
      onSourcesChange={setSources}
      onAnalyze={onAnalyze}
      loading={false}
    />
  );
}

describe("SourceEditor", () => {
  it("disables Analyze until a source has text", async () => {
    render(<Wrapper onAnalyze={vi.fn()} />);
    expect(screen.getByRole("button", { name: /analyze/i })).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText(/Paste text for source 1/i), "hello");
    expect(screen.getByRole("button", { name: /analyze/i })).toBeEnabled();
  });

  it("adds a new source block", async () => {
    render(<Wrapper onAnalyze={vi.fn()} />);
    expect(screen.getAllByPlaceholderText(/Paste text for source/i)).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: /add source/i }));
    expect(screen.getAllByPlaceholderText(/Paste text for source/i)).toHaveLength(2);
  });

  it("removes a source block", async () => {
    render(<Wrapper onAnalyze={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /add source/i }));
    expect(screen.getAllByPlaceholderText(/Paste text for source/i)).toHaveLength(2);

    await userEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]);
    expect(screen.getAllByPlaceholderText(/Paste text for source/i)).toHaveLength(1);
  });

  it("calls onAnalyze when clicked with text present", async () => {
    const onAnalyze = vi.fn();
    render(<Wrapper onAnalyze={onAnalyze} />);
    await userEvent.type(screen.getByPlaceholderText(/Paste text for source 1/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  it("auto-detects Markdown when the pasted text looks like Markdown", () => {
    render(<Wrapper onAnalyze={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Paste text for source 1/i);
    fireEvent.change(textarea, { target: { value: "# Title\n\n- one\n- two" } });
    expect(screen.getByRole("checkbox", { name: /markdown/i })).toBeChecked();
  });

  it("keeps a manual Markdown override even as the text keeps looking like Markdown", async () => {
    render(<Wrapper onAnalyze={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Paste text for source 1/i);
    fireEvent.change(textarea, { target: { value: "# Title\n\n- one\n- two" } });
    const checkbox = screen.getByRole("checkbox", { name: /markdown/i });
    expect(checkbox).toBeChecked();

    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    fireEvent.change(textarea, { target: { value: "# Title\n\n- one\n- two\n- three" } });
    expect(checkbox).not.toBeChecked();
  });

  it("shows a Split by headings button once Markdown text has 2+ headings, and splitting creates separate blocks", async () => {
    render(<Wrapper onAnalyze={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Paste text for source 1/i);
    fireEvent.change(textarea, { target: { value: "# Intro\nHello.\n\n# Details\nMore info." } });

    const splitButton = await screen.findByRole("button", { name: /split by headings/i });
    await userEvent.click(splitButton);

    expect(screen.getAllByPlaceholderText(/Paste text for source/i)).toHaveLength(2);
    expect(screen.getByDisplayValue("Source 1 — Intro")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Source 1 — Details")).toBeInTheDocument();
  });

  it("converts Markdown to plain text and turns the Markdown toggle off", async () => {
    render(<Wrapper onAnalyze={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Paste text for source 1/i);
    fireEvent.change(textarea, { target: { value: "**bold** and a [link](https://example.com)" } });

    const convertButton = await screen.findByRole("button", { name: /convert to plain text/i });
    await userEvent.click(convertButton);

    expect(textarea).toHaveValue("bold and a link");
    expect(screen.getByRole("checkbox", { name: /markdown/i })).not.toBeChecked();
  });
});
