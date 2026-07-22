import { useState } from "react";
import type { AnalysisMode, SpeedPreset, StatisticalOptions } from "../types";
import { ALLOWED_MODELS } from "../types";

interface ModeToggleProps {
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  topic: string;
  statisticalOptions: StatisticalOptions;
  onStatisticalOptionsChange: (options: StatisticalOptions) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  model: string;
  onModelChange: (model: string) => void;
}

const SPEED_PRESETS: Array<{ value: SpeedPreset; label: string; description: string }> = [
  { value: "fast", label: "Fast", description: "Cheap word-overlap similarity, fewer passes" },
  {
    value: "balanced",
    label: "Balanced",
    description: "Same similarity, more passes for a steadier rank",
  },
  { value: "precise", label: "Precise", description: "TF-IDF weighted similarity, most passes" },
];

const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet-5": "Claude Sonnet 5",
  "claude-opus-4-8": "Claude Opus 4.8",
  "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
  "claude-fable-5": "Claude Fable 5",
};

export function ModeToggle({
  mode,
  onModeChange,
  topic,
  statisticalOptions,
  onStatisticalOptionsChange,
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
}: ModeToggleProps) {
  const hasTopic = topic.trim().length > 0;
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
      <div
        className="flex gap-1 rounded-md bg-slate-900 p-1"
        role="group"
        aria-label="Analysis mode"
      >
        <button
          type="button"
          onClick={() => onModeChange("statistical")}
          aria-pressed={mode === "statistical"}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "statistical"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Statistical (no API key)
        </button>
        <button
          type="button"
          onClick={() => onModeChange("ai")}
          aria-pressed={mode === "ai"}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "ai" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          AI
        </button>
      </div>

      {mode === "statistical" && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Speed vs precision
            </label>
            <div className="flex gap-1 rounded-md bg-slate-900 p-1">
              {SPEED_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.description}
                  onClick={() =>
                    onStatisticalOptionsChange({ ...statisticalOptions, speed: preset.value })
                  }
                  aria-pressed={statisticalOptions.speed === preset.value}
                  className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                    statisticalOptions.speed === preset.value
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="topic-weight" className="block text-xs font-medium text-slate-400 mb-1">
              Corroboration <span className="text-slate-600">vs</span> Topic relevance
            </label>
            <input
              id="topic-weight"
              type="range"
              min={0}
              max={100}
              step={5}
              disabled={!hasTopic}
              value={Math.round(statisticalOptions.topicWeight * 100)}
              onChange={(e) =>
                onStatisticalOptionsChange({
                  ...statisticalOptions,
                  topicWeight: Number(e.target.value) / 100,
                })
              }
              className="w-full accent-indigo-500 disabled:opacity-40"
            />
            <p className="mt-1 text-xs text-slate-500">
              {hasTopic
                ? `${100 - Math.round(statisticalOptions.topicWeight * 100)}% corroboration / ${Math.round(statisticalOptions.topicWeight * 100)}% topic relevance`
                : "Add a topic above to enable topic-weighted ranking"}
            </p>
          </div>
        </div>
      )}

      {mode === "ai" && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label htmlFor="ai-model" className="block text-xs font-medium text-slate-400 mb-1">
              Model
            </label>
            <select
              id="ai-model"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ALLOWED_MODELS.map((m) => (
                <option key={m} value={m}>
                  {MODEL_LABELS[m] ?? m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ai-api-key" className="block text-xs font-medium text-slate-400 mb-1">
              Anthropic API key (optional)
            </label>
            <div className="flex gap-2">
              <input
                id="ai-api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="Leave blank to use the server's configured key"
                autoComplete="off"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="shrink-0 rounded-md border border-slate-700 px-2 text-xs text-slate-400 hover:text-slate-200"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-600">
              Stored only in this browser (localStorage) and sent with each request — never written
              to disk on the server.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
