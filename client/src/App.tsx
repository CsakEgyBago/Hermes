import { useState } from "react";
import { SourceEditor } from "./components/SourceEditor";
import { RankedList } from "./components/RankedList";
import { SourcePanel } from "./components/SourcePanel";
import { ModeToggle } from "./components/ModeToggle";
import { ThinkingView } from "./components/ThinkingView";
import { StatsPanel } from "./components/StatsPanel";
import { Summary } from "./components/Summary";
import { Collapsible } from "./components/Collapsible";
import { analyze } from "./api";
import { loadApiKey, loadModel, saveApiKey, saveModel } from "./lib/storage";
import type {
  AnalyzeMeta,
  AnalysisMode,
  RankedPoint,
  SourceText,
  StatisticalOptions,
} from "./types";

const DEFAULT_MODEL = "claude-sonnet-5";

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {[80, 55, 65].map((width, i) => (
        <div key={i} className="rounded-lg border border-slate-800 bg-slate-800/50 p-3">
          <div className="h-1.5 rounded-full bg-slate-700" style={{ width: `${width}%` }} />
          <div className="mt-2 h-3 w-2/3 rounded bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

function App() {
  const [mode, setMode] = useState<AnalysisMode>("statistical");
  const [statisticalOptions, setStatisticalOptions] = useState<StatisticalOptions>({
    speed: "balanced",
    topicWeight: 0.5,
  });
  const [apiKey, setApiKey] = useState(() => loadApiKey());
  const [model, setModel] = useState(() => loadModel(DEFAULT_MODEL));
  const [topic, setTopic] = useState("");
  const [sources, setSources] = useState<SourceText[]>([
    { id: "source-0", label: "Source 1", text: "", groupId: "source-0", isMarkdown: false },
  ]);
  const [points, setPoints] = useState<RankedPoint[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [meta, setMeta] = useState<AnalyzeMeta | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    saveApiKey(key);
  };

  const handleModelChange = (m: string) => {
    setModel(m);
    saveModel(m);
  };

  const handleSelectPoint = (index: number) => {
    setSelectedIndex(index);
    setSourcesOpen(true);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const nonEmptySources = sources
        .filter((s) => s.text.trim().length > 0)
        .map(({ id, label, text, groupId }) => ({ id, label, text, groupId }));
      const result = await analyze({
        mode,
        topic: topic.trim() || undefined,
        sources: nonEmptySources,
        statisticalOptions: mode === "statistical" ? statisticalOptions : undefined,
        apiKey: mode === "ai" && apiKey ? apiKey : undefined,
        model: mode === "ai" ? model : undefined,
      });
      setPoints(result.points);
      setSummary(result.summary ?? null);
      setMeta(result.meta ?? null);
      setSelectedIndex(result.points.length > 0 ? 0 : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const selectedPoint = selectedIndex !== null ? (points[selectedIndex] ?? null) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold">
            W
          </div>
          <h1 className="text-2xl font-semibold">Weight Calc</h1>
        </div>
        <p className="text-sm text-slate-400 mb-6">
          Paste in multiple sources and see what matters most, ranked by weight.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="flex flex-col gap-4">
            <ModeToggle
              mode={mode}
              onModeChange={setMode}
              topic={topic}
              statisticalOptions={statisticalOptions}
              onStatisticalOptionsChange={setStatisticalOptions}
              apiKey={apiKey}
              onApiKeyChange={handleApiKeyChange}
              model={model}
              onModelChange={handleModelChange}
            />
            <SourceEditor
              topic={topic}
              onTopicChange={setTopic}
              sources={sources}
              onSourcesChange={setSources}
              onAnalyze={handleAnalyze}
              loading={loading}
            />
            {error && (
              <p className="rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-4">
            {loading ? (
              <ResultsSkeleton />
            ) : (
              <>
                <Summary points={points} summary={summary} />
                <div>
                  <h2 className="text-sm font-medium text-slate-300 mb-2">Ranked points</h2>
                  <RankedList
                    points={points}
                    selectedIndex={selectedIndex}
                    onSelect={handleSelectPoint}
                  />
                </div>

                <Collapsible
                  title="Sources"
                  open={sourcesOpen}
                  onToggle={() => setSourcesOpen((v) => !v)}
                >
                  <SourcePanel sources={sources} selectedPoint={selectedPoint} />
                </Collapsible>

                {meta && (
                  <Collapsible
                    title="How this was computed"
                    open={thinkingOpen}
                    onToggle={() => setThinkingOpen((v) => !v)}
                  >
                    <ThinkingView meta={meta} />
                  </Collapsible>
                )}

                {meta && (
                  <Collapsible
                    title="Statistics"
                    open={statsOpen}
                    onToggle={() => setStatsOpen((v) => !v)}
                  >
                    <StatsPanel sources={sources} points={points} meta={meta} />
                  </Collapsible>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
