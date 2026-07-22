import { afterEach, describe, expect, it } from "vitest";
import { loadApiKey, loadModel, saveApiKey, saveModel } from "./storage";

afterEach(() => {
  localStorage.clear();
});

describe("apiKey storage", () => {
  it("returns an empty string when nothing is stored", () => {
    expect(loadApiKey()).toBe("");
  });

  it("round-trips a saved key", () => {
    saveApiKey("sk-abc123");
    expect(loadApiKey()).toBe("sk-abc123");
  });

  it("clears the stored key when saved with an empty string", () => {
    saveApiKey("sk-abc123");
    saveApiKey("");
    expect(loadApiKey()).toBe("");
  });
});

describe("model storage", () => {
  it("returns the given default when nothing is stored", () => {
    expect(loadModel("claude-sonnet-5")).toBe("claude-sonnet-5");
  });

  it("round-trips a saved model", () => {
    saveModel("claude-opus-4-8");
    expect(loadModel("claude-sonnet-5")).toBe("claude-opus-4-8");
  });
});
