import { ALLOWED_MODELS } from "./types.js";
import type { AnalyzeRequest } from "./types.js";

const SPEED_PRESETS = new Set(["fast", "balanced", "precise"]);
const MODELS = new Set<string>(ALLOWED_MODELS);

export function validateAnalyzeRequest(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return "Request body must be a JSON object.";
  }

  const { mode, sources, topic, statisticalOptions, apiKey, model } = body as AnalyzeRequest;

  if (mode !== "ai" && mode !== "statistical") {
    return 'mode must be "ai" or "statistical".';
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    return "At least one source with text is required.";
  }

  for (const source of sources) {
    if (typeof source?.id !== "string" || typeof source?.text !== "string") {
      return "Each source must have a string id and text.";
    }
    if (source.groupId !== undefined && typeof source.groupId !== "string") {
      return "Each source's groupId must be a string if provided.";
    }
  }

  if (topic !== undefined && typeof topic !== "string") {
    return "topic must be a string if provided.";
  }

  if (statisticalOptions !== undefined) {
    if (typeof statisticalOptions !== "object" || statisticalOptions === null) {
      return "statisticalOptions must be an object if provided.";
    }
    if (!SPEED_PRESETS.has(statisticalOptions.speed)) {
      return 'statisticalOptions.speed must be "fast", "balanced", or "precise".';
    }
    if (
      typeof statisticalOptions.topicWeight !== "number" ||
      statisticalOptions.topicWeight < 0 ||
      statisticalOptions.topicWeight > 1
    ) {
      return "statisticalOptions.topicWeight must be a number between 0 and 1.";
    }
  }

  if (apiKey !== undefined && (typeof apiKey !== "string" || apiKey.length === 0)) {
    return "apiKey must be a non-empty string if provided.";
  }

  if (model !== undefined && !MODELS.has(model)) {
    return `model must be one of: ${Array.from(MODELS).join(", ")}.`;
  }

  return null;
}
