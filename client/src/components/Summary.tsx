import type { RankedPoint } from "../types";
import { InlineMarkdown } from "./InlineMarkdown";

interface SummaryProps {
  points: RankedPoint[];
  summary: string | null;
}

export function Summary({ points, summary }: SummaryProps) {
  if (points.length === 0) return null;

  return (
    <div className="rounded-lg border border-indigo-500/40 bg-indigo-500/5 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-400 mb-1">Top result</p>
      <div className="text-lg font-semibold text-slate-100">
        <InlineMarkdown>{points[0].text}</InlineMarkdown>
      </div>
      {summary && (
        <div className="mt-2 text-sm text-slate-300">
          <InlineMarkdown>{summary}</InlineMarkdown>
        </div>
      )}
    </div>
  );
}
