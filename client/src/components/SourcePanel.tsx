import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import type { RankedPoint, SourceText } from "../types";
import { splitIntoSegments } from "../lib/highlight";

interface SourcePanelProps {
  sources: SourceText[];
  selectedPoint: RankedPoint | null;
}

function highlightText(text: string, quotes: string[]) {
  return splitIntoSegments(text, quotes).map((segment, i) =>
    segment.highlighted ? (
      <mark key={i} className="rounded bg-yellow-400/40 text-inherit">
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold text-slate-100 mt-2 mb-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-slate-100 mt-2 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>
  ),
  ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5">{children}</ol>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-indigo-400 underline hover:text-indigo-300"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-900 px-1 py-0.5 text-xs text-indigo-300">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-slate-600 pl-3 text-slate-400 italic">
      {children}
    </blockquote>
  ),
};

export function SourcePanel({ sources, selectedPoint }: SourcePanelProps) {
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [viewMode, setViewMode] = useState<Record<string, "raw" | "preview">>({});

  const getViewMode = (source: SourceText): "raw" | "preview" =>
    viewMode[source.id] ?? (source.isMarkdown ? "preview" : "raw");

  useEffect(() => {
    if (!selectedPoint) return;
    const sourceIdsWithQuotes = new Set(selectedPoint.sourceQuotes.map((q) => q.sourceId));
    if (sourceIdsWithQuotes.size === 0) return;
    setViewMode((prev) => {
      const next = { ...prev };
      for (const id of sourceIdsWithQuotes) next[id] = "raw";
      return next;
    });
  }, [selectedPoint]);

  useEffect(() => {
    if (!selectedPoint) return;
    const firstMatchingSourceId = selectedPoint.sourceQuotes[0]?.sourceId;
    if (!firstMatchingSourceId) return;
    const el = containerRefs.current[firstMatchingSourceId]?.querySelector("mark");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedPoint]);

  return (
    <div className="flex flex-col gap-3">
      {sources.map((source) => {
        const quotes = selectedPoint
          ? selectedPoint.sourceQuotes.filter((q) => q.sourceId === source.id).map((q) => q.quote)
          : [];
        const mode = getViewMode(source);

        return (
          <div
            key={source.id}
            className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300">{source.label}</h3>
              {source.isMarkdown && (
                <div className="flex gap-1 rounded bg-slate-900 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode((prev) => ({ ...prev, [source.id]: "preview" }))}
                    className={`rounded px-2 py-0.5 ${mode === "preview" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode((prev) => ({ ...prev, [source.id]: "raw" }))}
                    className={`rounded px-2 py-0.5 ${mode === "raw" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
                  >
                    Raw
                  </button>
                </div>
              )}
            </div>
            <div
              ref={(el) => {
                containerRefs.current[source.id] = el;
              }}
              className="max-h-64 overflow-y-auto text-sm text-slate-200"
            >
              {!source.text ? (
                <span className="text-slate-500">(empty)</span>
              ) : mode === "preview" ? (
                <div className="prose-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {source.text}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{highlightText(source.text, quotes)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
