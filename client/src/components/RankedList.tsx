import type { RankedPoint } from "../types";
import { InlineMarkdown } from "./InlineMarkdown";

interface RankedListProps {
  points: RankedPoint[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function RankedList({ points, selectedIndex, onSelect }: RankedListProps) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No results yet. Run an analysis to see ranked points here.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {points.map((point, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => onSelect(i)}
            className={`w-full text-left rounded-lg border p-3 shadow-sm transition-colors ${
              selectedIndex === i
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-slate-700 bg-slate-800/50 hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-mono text-slate-400 w-8 shrink-0">{point.weight}</span>
              <div className="h-1.5 flex-1 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-[width] duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, point.weight))}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-slate-100">
              <InlineMarkdown>{point.text}</InlineMarkdown>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              <InlineMarkdown>{point.rationale}</InlineMarkdown>
            </div>
          </button>
        </li>
      ))}
    </ol>
  );
}
