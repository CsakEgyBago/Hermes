import express from "express";
import cors from "cors";
import { analyzeSources } from "./anthropic.js";
import { analyzeStatistical } from "./statistical.js";
import { validateAnalyzeRequest } from "./validate.js";
import type { AnalyzeMeta, AnalyzeRequest, AnalyzeResponse } from "./types.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

app.post("/api/analyze", async (req, res) => {
  const validationError = validateAnalyzeRequest(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const body = req.body as AnalyzeRequest;
  const sourceCount = body.sources.length;
  const groupCount = new Set(body.sources.map((s) => s.groupId ?? s.id)).size;
  const wordCount = body.sources.reduce((sum, s) => sum + countWords(s.text), 0);

  const start = Date.now();
  try {
    let points: AnalyzeResponse["points"];
    let summary: string;
    let meta: AnalyzeMeta;

    if (body.mode === "statistical") {
      const result = analyzeStatistical(body.topic, body.sources, body.statisticalOptions);
      points = result.points;
      summary = result.summary;
      meta = {
        mode: "statistical",
        sourceCount,
        groupCount,
        wordCount,
        durationMs: 0,
        ...result.meta,
      };
    } else {
      const result = await analyzeSources(body.topic, body.sources, {
        apiKey: body.apiKey,
        model: body.model,
      });
      points = result.points;
      summary = result.summary ?? "";
      meta = { mode: "ai", sourceCount, groupCount, wordCount, durationMs: 0 };
    }

    meta.durationMs = Date.now() - start;
    res.json({ points, summary, meta } satisfies AnalyzeResponse);
  } catch (err) {
    console.error("Analyze failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Analysis failed" });
  }
});
