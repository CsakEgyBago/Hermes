import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { app } from "./app.js";
import { anthropic } from "./anthropic.js";

async function withServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn(`http://localhost:${port}`);
  } finally {
    server.close();
  }
}

test("POST /api/analyze 400s when mode is missing or invalid", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /mode must be/);
  });
});

test("POST /api/analyze 400s when sources are missing", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "ai" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /At least one source/);
  });
});

test("POST /api/analyze 400s on an invalid statisticalOptions.speed", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "statistical",
        sources: [{ id: "s1", label: "S1", text: "hi" }],
        statisticalOptions: { speed: "warp", topicWeight: 0.5 },
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /statisticalOptions\.speed/);
  });
});

test("POST /api/analyze (ai mode) returns points sorted by weight from the model", async (t) => {
  t.mock.method(anthropic.messages, "create", async () => ({
    content: [
      {
        type: "tool_use",
        id: "tool_1",
        name: "report_ranked_points",
        input: {
          summary: "Point b matters most, corroborated by the model's own read of the sources.",
          points: [
            { text: "point a", weight: 40, rationale: "r", sourceQuotes: [] },
            { text: "point b", weight: 90, rationale: "r", sourceQuotes: [] },
          ],
        },
      },
    ],
  }));

  await withServer(async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "ai", sources: [{ id: "s1", label: "S1", text: "hi" }] }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(
      body.points.map((p: { text: string }) => p.text),
      ["point b", "point a"],
    );
    assert.match(body.summary, /Point b matters most/);
    assert.equal(body.meta.mode, "ai");
    assert.equal(body.meta.sourceCount, 1);
    assert.equal(body.meta.groupCount, 1);
    assert.ok(body.meta.wordCount > 0);
    assert.ok(typeof body.meta.durationMs === "number");
  });
});

test("POST /api/analyze 400s on a model not on the allow-list", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "ai",
        sources: [{ id: "s1", label: "S1", text: "hi" }],
        model: "gpt-5",
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /model must be one of/);
  });
});

test("POST /api/analyze (ai mode) 500s with a clear message when the model skips tool use", async (t) => {
  t.mock.method(anthropic.messages, "create", async () => ({ content: [] }));

  await withServer(async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "ai", sources: [{ id: "s1", label: "S1", text: "hi" }] }),
    });
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.match(body.error, /tool_use/);
  });
});

test("POST /api/analyze (statistical mode) returns real ranked points with no API key needed", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "statistical",
        sources: [
          {
            id: "s1",
            label: "S1",
            text: "The server crashed due to a memory leak. Nothing else notable.",
          },
          {
            id: "s2",
            label: "S2",
            text: "The server crashed due to a memory leak. A different unrelated detail.",
          },
        ],
        statisticalOptions: { speed: "fast", topicWeight: 0.5 },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.points.length > 0);
    assert.equal(body.points[0].text, "The server crashed due to a memory leak.");
    for (let i = 1; i < body.points.length; i++) {
      assert.ok(body.points[i - 1].weight >= body.points[i].weight);
    }
    assert.match(body.summary, /The most important point is/);
    assert.equal(body.meta.mode, "statistical");
    assert.equal(body.meta.sourceCount, 2);
    assert.equal(body.meta.groupCount, 2);
    assert.ok(body.meta.sentenceCount > 0);
    assert.equal(body.meta.similarityMethod, "jaccard");
    assert.ok(typeof body.meta.converged === "boolean");
  });
});

test("POST /api/analyze (statistical mode) collapses groupCount for split pieces of the same file", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "statistical",
        sources: [
          { id: "s1a", label: "S1a", text: "First half of the file.", groupId: "file1" },
          { id: "s1b", label: "S1b", text: "Second half of the file.", groupId: "file1" },
        ],
        statisticalOptions: { speed: "fast", topicWeight: 0.5 },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.meta.sourceCount, 2);
    assert.equal(body.meta.groupCount, 1);
  });
});
