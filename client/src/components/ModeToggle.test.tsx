import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeToggle } from "./ModeToggle";
import type { AnalysisMode, StatisticalOptions } from "../types";

const defaultOptions: StatisticalOptions = { speed: "balanced", topicWeight: 0.5 };

function renderModeToggle(
  overrides: {
    mode?: AnalysisMode;
    onModeChange?: (mode: AnalysisMode) => void;
    topic?: string;
    statisticalOptions?: StatisticalOptions;
    onStatisticalOptionsChange?: (options: StatisticalOptions) => void;
    apiKey?: string;
    onApiKeyChange?: (key: string) => void;
    model?: string;
    onModelChange?: (model: string) => void;
  } = {},
) {
  return render(
    <ModeToggle
      mode={overrides.mode ?? "statistical"}
      onModeChange={overrides.onModeChange ?? vi.fn()}
      topic={overrides.topic ?? ""}
      statisticalOptions={overrides.statisticalOptions ?? defaultOptions}
      onStatisticalOptionsChange={overrides.onStatisticalOptionsChange ?? vi.fn()}
      apiKey={overrides.apiKey ?? ""}
      onApiKeyChange={overrides.onApiKeyChange ?? vi.fn()}
      model={overrides.model ?? "claude-sonnet-5"}
      onModelChange={overrides.onModelChange ?? vi.fn()}
    />,
  );
}

describe("ModeToggle", () => {
  it("reflects the current mode via aria-pressed", () => {
    renderModeToggle();
    expect(screen.getByRole("button", { name: /statistical/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^ai$/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onModeChange when switching to AI", async () => {
    const onModeChange = vi.fn();
    renderModeToggle({ onModeChange });
    await userEvent.click(screen.getByRole("button", { name: /^ai$/i }));
    expect(onModeChange).toHaveBeenCalledWith("ai");
  });

  it("hides the statistical options when AI mode is selected", () => {
    renderModeToggle({ mode: "ai" });
    expect(screen.queryByText(/speed vs precision/i)).not.toBeInTheDocument();
  });

  it("shows the speed preset and topic-weight controls in statistical mode", () => {
    renderModeToggle();
    expect(screen.getByText(/speed vs precision/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/corroboration/i)).toBeInTheDocument();
  });

  it("calls onStatisticalOptionsChange when a speed preset is clicked", async () => {
    const onChange = vi.fn();
    renderModeToggle({ onStatisticalOptionsChange: onChange });
    await userEvent.click(screen.getByRole("button", { name: /precise/i }));
    expect(onChange).toHaveBeenCalledWith({ speed: "precise", topicWeight: 0.5 });
  });

  it("disables the topic-weight slider when no topic is given", () => {
    renderModeToggle();
    expect(screen.getByLabelText(/corroboration/i)).toBeDisabled();
    expect(screen.getByText(/add a topic above/i)).toBeInTheDocument();
  });

  it("enables the topic-weight slider once a topic is present", () => {
    renderModeToggle({ topic: "database outage" });
    expect(screen.getByLabelText(/corroboration/i)).toBeEnabled();
  });

  it("calls onStatisticalOptionsChange when the slider moves", () => {
    const onChange = vi.fn();
    renderModeToggle({ topic: "database outage", onStatisticalOptionsChange: onChange });
    const slider = screen.getByLabelText(/corroboration/i);
    fireEvent.change(slider, { target: { value: "80" } });
    expect(onChange).toHaveBeenCalledWith({ speed: "balanced", topicWeight: 0.8 });
  });

  it("shows a model picker and API key input in AI mode", () => {
    renderModeToggle({ mode: "ai" });
    expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/anthropic api key/i)).toBeInTheDocument();
  });

  it("hides the model/API key controls in statistical mode", () => {
    renderModeToggle({ mode: "statistical" });
    expect(screen.queryByLabelText(/anthropic api key/i)).not.toBeInTheDocument();
  });

  it("calls onModelChange when a different model is picked", async () => {
    const onModelChange = vi.fn();
    renderModeToggle({ mode: "ai", onModelChange });
    await userEvent.selectOptions(screen.getByLabelText(/model/i), "claude-opus-4-8");
    expect(onModelChange).toHaveBeenCalledWith("claude-opus-4-8");
  });

  it("calls onApiKeyChange as the key is typed, masked by default", async () => {
    const onApiKeyChange = vi.fn();
    renderModeToggle({ mode: "ai", onApiKeyChange });
    const input = screen.getByLabelText(/anthropic api key/i);
    expect(input).toHaveAttribute("type", "password");
    await userEvent.type(input, "x");
    expect(onApiKeyChange).toHaveBeenCalledWith("x");
  });

  it("reveals the API key when Show is clicked", async () => {
    renderModeToggle({ mode: "ai", apiKey: "sk-secret" });
    const input = screen.getByLabelText(/anthropic api key/i);
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: /show/i }));
    expect(input).toHaveAttribute("type", "text");
  });
});
