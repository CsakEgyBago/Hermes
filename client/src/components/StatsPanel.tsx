import { computeSourceContributions } from "../lib/stats";
import type { AnalyzeMeta, RankedPoint, SourceText } from "../types";

interface StatsPanelProps {
  sources: SourceText[];
  points: RankedPoint[];
  meta: AnalyzeMeta | null;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

interface BarRowProps {
  label: string;
  value: number;
  max: number;
  tooltip: string;
}

function BarRow({ label, value, max, tooltip }: BarRowProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div className="group flex items-center gap-2" tabIndex={0}>
      <span className="w-32 shrink-0 truncate text-xs text-slate-400" title={label}>
        {label}
      </span>
      <div className="relative h-4 flex-1 rounded-md bg-slate-900">
        <div
          className="h-full rounded-r-md bg-indigo-500 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
        <div
          className="pointer-events-none absolute -top-7 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 group-focus:block group-hover:block"
          style={{ left: `${pct}%` }}
        >
          {tooltip}
        </div>
      </div>
    </div>
  );
}

export function StatsPanel({ sources, points, meta }: StatsPanelProps) {
  if (!meta) return null;

  const contributions = computeSourceContributions(sources, points);
  const maxContribution = Math.max(1, ...contributions.map((c) => c.count));

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 shadow-sm">
      <h2 className="text-sm font-medium text-slate-300 mb-3">Statistics</h2>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-4 sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Sources</dt>
          <dd className="text-slate-200 font-mono">{meta.sourceCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Files</dt>
          <dd className="text-slate-200 font-mono">{meta.groupCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Words</dt>
          <dd className="text-slate-200 font-mono">{meta.wordCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Duration</dt>
          <dd className="text-slate-200 font-mono">{meta.durationMs}ms</dd>
        </div>
        {meta.mode === "statistical" && (
          <>
            <div>
              <dt className="text-slate-500">Sentences</dt>
              <dd className="text-slate-200 font-mono">{meta.sentenceCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Graph edges</dt>
              <dd className="text-slate-200 font-mono">{meta.edgeCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Iterations</dt>
              <dd className="text-slate-200 font-mono">{meta.iterations}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Converged</dt>
              <dd className="text-slate-200 font-mono">{meta.converged ? "yes" : "no"}</dd>
            </div>
          </>
        )}
      </dl>

      {points.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-medium text-slate-400 mb-1.5">Weight distribution</h3>
          <div className="flex flex-col gap-1.5">
            {points.map((point, i) => (
              <BarRow
                key={i}
                label={truncate(point.text, 28)}
                value={point.weight}
                max={100}
                tooltip={`Weight: ${point.weight}`}
              />
            ))}
          </div>
        </div>
      )}

      {contributions.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-400 mb-1.5">Per-source contribution</h3>
          <div className="flex flex-col gap-1.5">
            {contributions.map((c) => (
              <BarRow
                key={c.sourceId}
                label={c.label}
                value={c.count}
                max={maxContribution}
                tooltip={`${c.count} point${c.count === 1 ? "" : "s"}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
