import type { AnalyzeMeta } from "../types";

export function buildThinkingSteps(meta: AnalyzeMeta): string[] {
  const fileWord = meta.groupCount === 1 ? "file" : "files";
  const steps = [
    `Read ${meta.sourceCount} source${meta.sourceCount === 1 ? "" : "s"} (${meta.groupCount} distinct ${fileWord}, ${meta.wordCount} words)`,
  ];

  if (meta.mode === "statistical") {
    steps.push(`Segmented into ${meta.sentenceCount ?? 0} sentences`);
    const method = meta.similarityMethod === "tfidf-cosine" ? "TF-IDF cosine" : "word-overlap";
    steps.push(`Built a similarity graph with ${meta.edgeCount ?? 0} edges (${method} similarity)`);
    steps.push(
      `Ran ${meta.iterations ?? 0} ranking pass${meta.iterations === 1 ? "" : "es"} (${meta.converged ? "converged" : "hit the iteration cap"})`,
    );
  } else {
    steps.push("Sent the sources to Claude for extraction and ranking");
    steps.push("Received ranked points back from the model");
  }

  steps.push(`Finished in ${meta.durationMs}ms`);
  return steps;
}
