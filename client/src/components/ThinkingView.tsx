import { useEffect, useState } from "react";
import type { AnalyzeMeta } from "../types";
import { buildThinkingSteps } from "../lib/thinking";

const REVEAL_INTERVAL_MS = 220;

interface ThinkingViewProps {
  meta: AnalyzeMeta | null;
}

export function ThinkingView({ meta }: ThinkingViewProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    if (!meta) return;
    const steps = buildThinkingSteps(meta);
    const timers = steps.map((_, i) =>
      setTimeout(() => setVisibleCount((count) => Math.max(count, i + 1)), i * REVEAL_INTERVAL_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [meta]);

  if (!meta) return null;

  const steps = buildThinkingSteps(meta);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 shadow-sm">
      <h2 className="text-sm font-medium text-slate-300 mb-2">How this was computed</h2>
      <ol className="flex flex-col gap-1 text-xs text-slate-400">
        {steps.slice(0, visibleCount).map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-indigo-400">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-slate-600">
        Real numbers from this analysis, revealed one at a time — not a live stream.
      </p>
    </div>
  );
}
