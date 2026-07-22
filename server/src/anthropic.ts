import Anthropic from "@anthropic-ai/sdk";
import type { AnalyzeResponse, RankedPoint, SourceText } from "./types.js";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";

export function getAnthropicClient(apiKey?: string): Anthropic {
  return apiKey ? new Anthropic({ apiKey }) : anthropic;
}

const RANK_TOOL = {
  name: "report_ranked_points",
  description:
    "Report the distinct key points extracted from the provided sources, ranked by importance weight, plus a short overall summary.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description:
          'A 2-3 sentence plain-language summary synthesizing the overall findings across all the points below — the "headline answer" a reader would want first.',
      },
      points: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The extracted point, stated in plain language.",
            },
            weight: {
              type: "number",
              description:
                "Importance score from 0-100. Weight higher when the point is corroborated by multiple sources and/or highly relevant to the given topic.",
            },
            rationale: {
              type: "string",
              description:
                "One short sentence on why this point matters / why it was weighted this way.",
            },
            sourceQuotes: {
              type: "array",
              description:
                "For each source that supports this point, a verbatim substring copied exactly (character for character) from that source's text.",
              items: {
                type: "object",
                properties: {
                  sourceId: { type: "string" },
                  quote: { type: "string" },
                },
                required: ["sourceId", "quote"],
              },
            },
          },
          required: ["text", "weight", "rationale", "sourceQuotes"],
        },
      },
    },
    required: ["summary", "points"],
  },
};

export function buildPrompt(topic: string | undefined, sources: SourceText[]): string {
  const sourceBlocks = sources
    .map((s) => `<source id="${s.id}" label="${s.label}">\n${s.text}\n</source>`)
    .join("\n\n");

  const topicLine = topic
    ? `The user is specifically interested in this topic/question: "${topic}". Weight points higher when they are more relevant to it.`
    : "No specific topic was given, so weight points based on how central and well-corroborated they are across the sources.";

  return `You will be given several text sources. Extract the distinct key points made across them, then weight each by importance.

${topicLine}

Weight points higher when:
- They are corroborated by multiple sources
- They are highly relevant to the topic (if given)

When quoting from a source, copy the substring exactly as it appears in that source's text, so it can be located verbatim.

Sources:

${sourceBlocks}`;
}

export function normalizePoints(rawPoints: RankedPoint[]): RankedPoint[] {
  return rawPoints
    .map((p) => ({
      ...p,
      weight: Math.max(0, Math.min(100, Math.round(p.weight))),
    }))
    .sort((a, b) => b.weight - a.weight);
}

export async function analyzeSources(
  topic: string | undefined,
  sources: SourceText[],
  options?: { apiKey?: string; model?: string },
): Promise<AnalyzeResponse> {
  const client = getAnthropicClient(options?.apiKey);
  const message = await client.messages.create({
    model: options?.model ?? MODEL,
    max_tokens: 4096,
    tools: [RANK_TOOL],
    tool_choice: { type: "tool", name: "report_ranked_points" },
    messages: [{ role: "user", content: buildPrompt(topic, sources) }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Model did not return a tool_use response");
  }

  const input = toolUse.input as { points: RankedPoint[]; summary?: string };

  return { points: normalizePoints(input.points ?? []), summary: input.summary ?? "" };
}
