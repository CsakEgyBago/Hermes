export interface SourceText {
  id: string;
  label: string;
  text: string;
  /** Shared by pieces that came from splitting one original block; defaults to `id` when absent. */
  groupId?: string;
}

export interface SourceQuote {
  sourceId: string;
  quote: string;
}

export interface RankedPoint {
  text: string;
  weight: number;
  rationale: string;
  sourceQuotes: SourceQuote[];
}

export type AnalysisMode = "ai" | "statistical";

export type SpeedPreset = "fast" | "balanced" | "precise";

export interface StatisticalOptions {
  speed: SpeedPreset;
  /** 0 (pure corroboration) to 1 (pure topic relevance). Ignored when no topic is given. */
  topicWeight: number;
}

export interface AnalyzeRequest {
  mode: AnalysisMode;
  topic?: string;
  sources: SourceText[];
  statisticalOptions?: StatisticalOptions;
  /** AI mode only: overrides the server's configured Anthropic API key for this request. */
  apiKey?: string;
  /** AI mode only: overrides the default model for this request. */
  model?: string;
}

export interface AnalyzeMeta {
  mode: AnalysisMode;
  sourceCount: number;
  groupCount: number;
  wordCount: number;
  durationMs: number;
  sentenceCount?: number;
  edgeCount?: number;
  iterations?: number;
  converged?: boolean;
  similarityMethod?: "jaccard" | "tfidf-cosine";
}

export interface AnalyzeResponse {
  points: RankedPoint[];
  summary?: string;
  meta?: AnalyzeMeta;
}

export const ALLOWED_MODELS = [
  "claude-sonnet-5",
  "claude-opus-4-8",
  "claude-haiku-4-5-20251001",
  "claude-fable-5",
] as const;

export type AllowedModel = (typeof ALLOWED_MODELS)[number];
