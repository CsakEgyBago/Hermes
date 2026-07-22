import type {
  RankedPoint,
  SourceQuote,
  SourceText,
  SpeedPreset,
  StatisticalOptions,
} from "./types.js";

export interface StatisticalMeta {
  sentenceCount: number;
  edgeCount: number;
  iterations: number;
  converged: boolean;
  similarityMethod: "jaccard" | "tfidf-cosine";
}

export interface StatisticalResult {
  points: RankedPoint[];
  summary: string;
  meta: StatisticalMeta;
}

export function buildSummary(points: RankedPoint[]): string {
  if (points.length === 0) return "No significant points were found in the given sources.";

  const [top, ...rest] = points;
  let summary = `The most important point is: "${top.text}" (${top.rationale}).`;

  const others = rest.slice(0, 2);
  if (others.length > 0) {
    const quoted = others.map((p) => `"${p.text}"`).join(" and ");
    summary += ` Other notable points include ${quoted}.`;
  }

  return summary;
}

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "so",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "for",
  "with",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "from",
  "up",
  "down",
  "out",
  "off",
  "over",
  "under",
  "again",
  "further",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "having",
  "do",
  "does",
  "did",
  "doing",
  "will",
  "would",
  "should",
  "could",
  "can",
  "may",
  "might",
  "must",
  "shall",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "them",
  "his",
  "her",
  "its",
  "our",
  "their",
  "not",
  "no",
  "as",
  "there",
  "here",
  "what",
  "which",
  "who",
  "whom",
  "such",
  "than",
  "too",
  "very",
  "just",
  "also",
  "it's",
]);

const MIN_SENTENCE_LENGTH = 3;
const DAMPING = 0.85;
const DEDUPE_THRESHOLD = 0.5;
const TOP_K = 10;

interface PresetConfig {
  useTfidf: boolean;
  maxIterations: number;
  epsilon: number;
  edgeThreshold: number;
}

const PRESETS: Record<SpeedPreset, PresetConfig> = {
  fast: { useTfidf: false, maxIterations: 10, epsilon: 1e-2, edgeThreshold: 0.2 },
  balanced: { useTfidf: false, maxIterations: 30, epsilon: 1e-4, edgeThreshold: 0.1 },
  precise: { useTfidf: true, maxIterations: 100, epsilon: 1e-6, edgeThreshold: 0.05 },
};

interface SentenceNode {
  sourceId: string;
  groupId: string;
  text: string;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

export function splitSentences(text: string): string[] {
  // Strip Markdown heading lines first: they have no sentence-ending
  // punctuation, so left in place they'd glue onto whatever prose follows
  // instead of being split off (or dropped) on their own.
  const withoutHeadings = text
    .split("\n")
    .filter((line) => !/^#{1,6}\s+/.test(line))
    .join("\n");

  return withoutHeadings
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_SENTENCE_LENGTH);
}

export function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const term of setA) if (setB.has(term)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function computeIdf(tokenSets: string[][]): Map<string, number> {
  const docFreq = new Map<string, number>();
  for (const tokens of tokenSets) {
    for (const term of new Set(tokens)) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  const total = tokenSets.length;
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((total + 1) / (df + 1)) + 1);
  }
  return idf;
}

function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>();
  for (const term of tokens) tf.set(term, (tf.get(term) ?? 0) + 1);
  const vector = new Map<string, number>();
  for (const [term, count] of tf) {
    vector.set(term, (count / tokens.length) * (idf.get(term) ?? 0));
  }
  return vector;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [term, weight] of a) {
    const other = b.get(term);
    if (other) dot += weight * other;
  }
  let normA = 0;
  for (const weight of a.values()) normA += weight * weight;
  let normB = 0;
  for (const weight of b.values()) normB += weight * weight;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function buildTeleportVector(topicScores: number[], alpha: number): number[] {
  const n = topicScores.length;
  const uniform = 1 / n;
  const sum = topicScores.reduce((a, b) => a + b, 0);
  if (alpha <= 0 || sum <= 0) return Array.from({ length: n }, () => uniform);
  return topicScores.map((score) => alpha * (score / sum) + (1 - alpha) * uniform);
}

interface RankResult {
  rank: number[];
  iterations: number;
  converged: boolean;
}

function rankNodes(matrix: number[][], teleport: number[], preset: PresetConfig): RankResult {
  const n = matrix.length;
  if (n === 0) return { rank: [], iterations: 0, converged: true };
  const outWeightSum = matrix.map((row) => row.reduce((a, b) => a + b, 0));
  let rank = Array.from({ length: n }, () => 1 / n);
  let iterations = 0;
  let converged = false;
  for (let iter = 0; iter < preset.maxIterations; iter++) {
    iterations = iter + 1;
    const next = Array.from({ length: n }, () => 0);
    for (let i = 0; i < n; i++) {
      let incoming = 0;
      for (let j = 0; j < n; j++) {
        if (matrix[j][i] > 0 && outWeightSum[j] > 0) {
          incoming += (matrix[j][i] / outWeightSum[j]) * rank[j];
        }
      }
      next[i] = (1 - DAMPING) * teleport[i] + DAMPING * incoming;
    }
    let delta = 0;
    for (let i = 0; i < n; i++) delta += Math.abs(next[i] - rank[i]);
    rank = next;
    if (delta < preset.epsilon) {
      converged = true;
      break;
    }
  }
  return { rank, iterations, converged };
}

export function analyzeStatistical(
  topic: string | undefined,
  sources: SourceText[],
  options?: StatisticalOptions,
): StatisticalResult {
  const preset = PRESETS[options?.speed ?? "balanced"];
  const alpha = topic ? clamp01(options?.topicWeight ?? 0.5) : 0;

  const nodes: SentenceNode[] = [];
  const tokenSets: string[][] = [];
  for (const source of sources) {
    const groupId = source.groupId ?? source.id;
    for (const sentence of splitSentences(source.text)) {
      const tokens = tokenize(sentence);
      if (tokens.length === 0) continue;
      nodes.push({ sourceId: source.id, groupId, text: sentence });
      tokenSets.push(tokens);
    }
  }

  const n = nodes.length;
  if (n === 0) {
    return {
      points: [],
      summary: buildSummary([]),
      meta: {
        sentenceCount: 0,
        edgeCount: 0,
        iterations: 0,
        converged: true,
        similarityMethod: preset.useTfidf ? "tfidf-cosine" : "jaccard",
      },
    };
  }

  const idf = preset.useTfidf ? computeIdf(tokenSets) : null;
  const vectors = idf ? tokenSets.map((tokens) => tfidfVector(tokens, idf)) : null;

  const similarity = (i: number, j: number): number =>
    vectors
      ? cosineSimilarity(vectors[i], vectors[j])
      : jaccardSimilarity(tokenSets[i], tokenSets[j]);

  const matrix: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  let edgeCount = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (nodes[i].sourceId !== nodes[j].sourceId && nodes[i].groupId === nodes[j].groupId)
        continue;
      const sim = similarity(i, j);
      if (sim >= preset.edgeThreshold) {
        matrix[i][j] = sim;
        matrix[j][i] = sim;
        edgeCount++;
      }
    }
  }

  const topicTokens = topic ? tokenize(topic) : [];
  const topicVector = vectors && topicTokens.length > 0 ? tfidfVector(topicTokens, idf!) : null;
  const topicScores = tokenSets.map((tokens, i) => {
    if (topicTokens.length === 0) return 0;
    return topicVector && vectors
      ? cosineSimilarity(vectors[i], topicVector)
      : jaccardSimilarity(tokens, topicTokens);
  });

  const teleport = buildTeleportVector(topicScores, alpha);
  const { rank, iterations, converged } = rankNodes(matrix, teleport, preset);

  const order = nodes.map((_, i) => i).sort((a, b) => rank[b] - rank[a]);

  const assigned = Array.from({ length: n }, () => false);
  const clusters: Array<{ indices: number[]; rank: number }> = [];
  for (const i of order) {
    if (assigned[i]) continue;
    assigned[i] = true;
    const indices = [i];
    for (const j of order) {
      if (assigned[j] || j === i) continue;
      if (similarity(i, j) >= DEDUPE_THRESHOLD) {
        assigned[j] = true;
        indices.push(j);
      }
    }
    clusters.push({ indices, rank: rank[i] });
    if (clusters.length >= TOP_K) break;
  }

  const weights = clusters.map((c) => c.rank);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const spread = maxWeight - minWeight;

  const points: RankedPoint[] = clusters.map((cluster) => {
    const rep = nodes[cluster.indices[0]];
    const quoteMap = new Map<string, SourceQuote>();
    for (const idx of cluster.indices) {
      const node = nodes[idx];
      const key = `${node.sourceId}::${node.text}`;
      if (!quoteMap.has(key)) quoteMap.set(key, { sourceId: node.sourceId, quote: node.text });
    }
    const distinctGroups = new Set(cluster.indices.map((idx) => nodes[idx].groupId)).size;

    const rationaleParts = [
      distinctGroups > 1
        ? `Corroborated across ${distinctGroups} sources`
        : "Mentioned in 1 source",
    ];
    if (topic && alpha > 0) rationaleParts.push("relevant to your topic");

    return {
      text: rep.text,
      weight:
        spread === 0
          ? 100
          : Math.max(0, Math.min(100, Math.round(((cluster.rank - minWeight) / spread) * 100))),
      rationale: rationaleParts.join(", "),
      sourceQuotes: Array.from(quoteMap.values()),
    };
  });

  const sortedPoints = points.sort((a, b) => b.weight - a.weight);

  return {
    points: sortedPoints,
    summary: buildSummary(sortedPoints),
    meta: {
      sentenceCount: n,
      edgeCount,
      iterations,
      converged,
      similarityMethod: preset.useTfidf ? "tfidf-cosine" : "jaccard",
    },
  };
}
