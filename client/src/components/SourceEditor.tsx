import { useState } from "react";
import type { SourceText } from "../types";
import {
  countHeadings,
  looksLikeMarkdown,
  markdownToPlainText,
  splitByHeadings,
} from "../lib/markdown";

interface SourceEditorProps {
  topic: string;
  onTopicChange: (topic: string) => void;
  sources: SourceText[];
  onSourcesChange: (sources: SourceText[]) => void;
  onAnalyze: () => void;
  loading: boolean;
}

let nextId = 1;

export function SourceEditor({
  topic,
  onTopicChange,
  sources,
  onSourcesChange,
  onAnalyze,
  loading,
}: SourceEditorProps) {
  const [manuallySet, setManuallySet] = useState<Set<string>>(new Set());

  const updateSource = (id: string, patch: Partial<SourceText>) => {
    onSourcesChange(
      sources.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        if (patch.text !== undefined && !manuallySet.has(id)) {
          next.isMarkdown = looksLikeMarkdown(patch.text);
        }
        return next;
      }),
    );
  };

  const toggleMarkdown = (id: string) => {
    setManuallySet((prev) => new Set(prev).add(id));
    updateSource(id, { isMarkdown: !sources.find((s) => s.id === id)?.isMarkdown });
  };

  const addSource = () => {
    const id = `source-${nextId++}`;
    onSourcesChange([
      ...sources,
      { id, label: `Source ${sources.length + 1}`, text: "", groupId: id, isMarkdown: false },
    ]);
  };

  const removeSource = (id: string) => {
    onSourcesChange(sources.filter((s) => s.id !== id));
  };

  const splitSource = (source: SourceText) => {
    const sections = splitByHeadings(source.text);
    if (sections.length < 2) return;
    const pieces: SourceText[] = sections.map((section, i) => {
      const id = `source-${nextId++}`;
      return {
        id,
        label: section.heading
          ? `${source.label} — ${section.heading}`
          : `${source.label} (${i + 1})`,
        text: section.content,
        groupId: source.groupId,
        isMarkdown: true,
      };
    });
    const index = sources.findIndex((s) => s.id === source.id);
    const next = [...sources];
    next.splice(index, 1, ...pieces);
    onSourcesChange(next);
  };

  const convertToPlainText = (source: SourceText) => {
    setManuallySet((prev) => new Set(prev).add(source.id));
    updateSource(source.id, { text: markdownToPlainText(source.text), isMarkdown: false });
  };

  const canAnalyze = !loading && sources.some((s) => s.text.trim().length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Topic / question (optional)
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="e.g. What caused the outage?"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-3">
        {sources.map((source, i) => {
          const headingCount = source.isMarkdown ? countHeadings(source.text) : 0;
          return (
            <div
              key={source.id}
              className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <input
                  type="text"
                  value={source.label}
                  onChange={(e) => updateSource(source.id, { label: e.target.value })}
                  className="text-sm font-medium bg-transparent text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 min-w-0 flex-1"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1 text-xs text-slate-400 select-none">
                    <input
                      type="checkbox"
                      checked={source.isMarkdown}
                      onChange={() => toggleMarkdown(source.id)}
                      className="accent-indigo-500"
                    />
                    Markdown
                  </label>
                  {sources.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSource(source.id)}
                      className="text-xs text-slate-500 hover:text-red-400"
                      aria-label={`Remove ${source.label}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={source.text}
                onChange={(e) => updateSource(source.id, { text: e.target.value })}
                placeholder={`Paste text for source ${i + 1}...`}
                rows={6}
                className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {source.isMarkdown && (
                <div className="mt-2 flex items-center gap-3">
                  {headingCount >= 2 && (
                    <button
                      type="button"
                      onClick={() => splitSource(source)}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Split by headings ({headingCount})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => convertToPlainText(source)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Convert to plain text
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addSource}
          className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          + Add source
        </button>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="ml-auto rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>
    </div>
  );
}
