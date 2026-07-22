import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAnalyzeRequest } from "./validate.js";

test("rejects a non-object body", () => {
  assert.equal(validateAnalyzeRequest(null), "Request body must be a JSON object.");
  assert.equal(validateAnalyzeRequest("nope"), "Request body must be a JSON object.");
});

test("rejects a missing or invalid mode", () => {
  assert.match(validateAnalyzeRequest({}) ?? "", /mode must be/);
  assert.match(validateAnalyzeRequest({ mode: "psychic" }) ?? "", /mode must be/);
});

test("rejects missing or empty sources", () => {
  assert.match(validateAnalyzeRequest({ mode: "ai" }) ?? "", /At least one source/);
  assert.match(validateAnalyzeRequest({ mode: "ai", sources: [] }) ?? "", /At least one source/);
});

test("rejects sources missing id or text", () => {
  const err = validateAnalyzeRequest({ mode: "ai", sources: [{ id: "a" }] });
  assert.match(err ?? "", /must have a string id and text/);
});

test("rejects a non-string groupId", () => {
  const err = validateAnalyzeRequest({
    mode: "ai",
    sources: [{ id: "a", label: "A", text: "hi", groupId: 5 }],
  });
  assert.match(err ?? "", /groupId must be a string/);
});

test("accepts a valid groupId", () => {
  const err = validateAnalyzeRequest({
    mode: "ai",
    sources: [{ id: "a", label: "A", text: "hi", groupId: "file1" }],
  });
  assert.equal(err, null);
});

test("rejects a non-string topic", () => {
  const err = validateAnalyzeRequest({
    mode: "ai",
    sources: [{ id: "a", label: "A", text: "hi" }],
    topic: 5,
  });
  assert.match(err ?? "", /topic must be a string/);
});

test("rejects an invalid statisticalOptions.speed", () => {
  const err = validateAnalyzeRequest({
    mode: "statistical",
    sources: [{ id: "a", label: "A", text: "hi" }],
    statisticalOptions: { speed: "warp", topicWeight: 0.5 },
  });
  assert.match(err ?? "", /statisticalOptions\.speed/);
});

test("rejects an out-of-range statisticalOptions.topicWeight", () => {
  const err = validateAnalyzeRequest({
    mode: "statistical",
    sources: [{ id: "a", label: "A", text: "hi" }],
    statisticalOptions: { speed: "fast", topicWeight: 1.5 },
  });
  assert.match(err ?? "", /statisticalOptions\.topicWeight/);
});

test("rejects an empty apiKey", () => {
  const err = validateAnalyzeRequest({
    mode: "ai",
    sources: [{ id: "a", label: "A", text: "hi" }],
    apiKey: "",
  });
  assert.match(err ?? "", /apiKey must be a non-empty string/);
});

test("rejects a model not on the allow-list", () => {
  const err = validateAnalyzeRequest({
    mode: "ai",
    sources: [{ id: "a", label: "A", text: "hi" }],
    model: "gpt-5",
  });
  assert.match(err ?? "", /model must be one of/);
});

test("accepts a valid apiKey and model", () => {
  const err = validateAnalyzeRequest({
    mode: "ai",
    sources: [{ id: "a", label: "A", text: "hi" }],
    apiKey: "sk-something",
    model: "claude-opus-4-8",
  });
  assert.equal(err, null);
});

test("accepts a valid ai-mode request", () => {
  const err = validateAnalyzeRequest({
    mode: "ai",
    sources: [{ id: "a", label: "A", text: "hi" }],
    topic: "what happened",
  });
  assert.equal(err, null);
});

test("accepts a valid statistical-mode request", () => {
  const err = validateAnalyzeRequest({
    mode: "statistical",
    sources: [{ id: "a", label: "A", text: "hi" }],
    statisticalOptions: { speed: "balanced", topicWeight: 0.5 },
  });
  assert.equal(err, null);
});
