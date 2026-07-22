import { test } from "node:test";
import assert from "node:assert/strict";
import { anthropic, buildPrompt, getAnthropicClient, normalizePoints } from "./anthropic.js";

test("buildPrompt includes the topic and labeled source blocks", () => {
  const prompt = buildPrompt("outage cause", [
    { id: "s1", label: "Incident report", text: "the database went down at 2am" },
  ]);
  assert.match(prompt, /outage cause/);
  assert.match(prompt, /Incident report/);
  assert.match(prompt, /the database went down at 2am/);
});

test("buildPrompt falls back to corroboration guidance when no topic is given", () => {
  const prompt = buildPrompt(undefined, [{ id: "s1", label: "S1", text: "x" }]);
  assert.match(prompt, /No specific topic was given/);
});

test("normalizePoints clamps weight into 0-100 and rounds", () => {
  const [point] = normalizePoints([{ text: "a", weight: 150, rationale: "", sourceQuotes: [] }]);
  assert.equal(point.weight, 100);

  const [negative] = normalizePoints([{ text: "a", weight: -10, rationale: "", sourceQuotes: [] }]);
  assert.equal(negative.weight, 0);

  const [rounded] = normalizePoints([{ text: "a", weight: 50.6, rationale: "", sourceQuotes: [] }]);
  assert.equal(rounded.weight, 51);
});

test("normalizePoints sorts by weight descending", () => {
  const result = normalizePoints([
    { text: "low", weight: 10, rationale: "", sourceQuotes: [] },
    { text: "high", weight: 90, rationale: "", sourceQuotes: [] },
    { text: "mid", weight: 50, rationale: "", sourceQuotes: [] },
  ]);
  assert.deepEqual(
    result.map((p) => p.text),
    ["high", "mid", "low"],
  );
});

test("getAnthropicClient returns the shared client when no override key is given", () => {
  assert.equal(getAnthropicClient(undefined), anthropic);
  assert.equal(getAnthropicClient(""), anthropic);
});

test("getAnthropicClient constructs a distinct client configured with the override key", () => {
  const client = getAnthropicClient("sk-test-override-key");
  assert.notEqual(client, anthropic);
  assert.equal(client.apiKey, "sk-test-override-key");
});
