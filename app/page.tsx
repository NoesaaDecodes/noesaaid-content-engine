"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Captions,
  Check,
  Clapperboard,
  Clipboard,
  Download,
  FileJson,
  FileVideo,
  FolderOpen,
  Hash,
  History,
  Loader2,
  Megaphone,
  Play,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Trophy,
  Wand2,
  Zap,
} from "lucide-react";
import {
  defaultPresetId,
  reelPresets,
  type ReelPreset,
} from "@/app/lib/presets";
import {
  defaultTemplateId,
  reelTemplates,
} from "@/app/lib/templates";
import {
  defaultRenderSettings,
  durationModes,
  renderQualities,
  subtitleSizes,
  type RenderSettings,
} from "@/app/lib/render-settings";

type FormState = {
  presetId: string;
  topic: string;
  category: string;
  platform: string;
  tone: string;
};

type GeneratedResult = {
  hook?: string;
  title?: string;
  script?: string[] | string;
  caption?: string;
  hashtags?: string[] | string;
};

type ApiResponse =
  | {
      success: true;
      result: GeneratedResult;
      input?: FormState & { batchCount?: number };
    }
  | {
      success: true;
      results: GeneratedResult[];
      input?: FormState & { batchCount?: number };
    }
  | {
      success: false;
      error?: string;
      detail?: string;
    };

type RenderResponse =
  | {
      success: true;
      output: {
        filename: string;
        outputPath: string;
        publicPath: string;
        downloadUrl: string;
        duration: number;
        usedFootage: string | null;
        usedMusic: string | null;
        subtitleCount: number;
        templateId: string;
        templateName: string;
        settings: RenderSettings;
      };
    }
  | {
      success: false;
      error?: string;
      detail?: string;
    };

type RenderOutput = Extract<RenderResponse, { success: true }>["output"];

type AssetFile = {
  name: string;
  path: string;
  type: string;
};

type AssetResponse = {
  footage: AssetFile[];
  music: AssetFile[];
};

type HistoryItem = {
  id: string;
  createdAt: string;
  form: FormState;
  result: GeneratedResult;
};

type ResultTab = "script" | "caption" | "hashtags" | "preview";

const historyStorageKey = "noesaaid-reels-engine-history";
const defaultPreset = getClientPreset(defaultPresetId);

const initialForm: FormState = {
  presetId: defaultPreset.id,
  topic: defaultPreset.defaultTopic,
  category: defaultPreset.categories[0],
  platform: defaultPreset.platforms[0],
  tone: defaultPreset.tones[0],
};

const anglePresets = [
  { label: "Savage", categoryIndex: 0, toneIndex: 0 },
  { label: "Emotional", categoryIndex: 1, toneIndex: 1 },
  { label: "Hype", categoryIndex: 2, toneIndex: 2 },
  { label: "Timely", categoryIndex: 3, toneIndex: 0 },
  { label: "Premium", categoryIndex: 0, toneIndex: 3 },
  { label: "Street", categoryIndex: 1, toneIndex: 2 },
];

const resultTabs: Array<{ id: ResultTab; label: string }> = [
  { id: "script", label: "Script" },
  { id: "caption", label: "Caption" },
  { id: "hashtags", label: "Hashtags" },
  { id: "preview", label: "Preview" },
];

const batchCounts = [3, 5, 10] as const;

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [batchResults, setBatchResults] = useState<GeneratedResult[]>([]);
  const [batchCount, setBatchCount] = useState<(typeof batchCounts)[number]>(3);
  const [batchGeneratedAt, setBatchGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTab>("script");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderOutput, setRenderOutput] = useState<RenderOutput | null>(null);
  const [assets, setAssets] = useState<AssetResponse>({
    footage: [],
    music: [],
  });
  const [assetError, setAssetError] = useState<string | null>(null);
  const [selectedFootage, setSelectedFootage] = useState("");
  const [selectedMusic, setSelectedMusic] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(
    defaultRenderSettings
  );
  const selectedPreset = getClientPreset(form.presetId);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(historyStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as HistoryItem[];
        setHistory(
          parsed.map((item) => ({
            ...item,
            form: normalizeFormState(item.form),
          }))
        );
      }
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    async function loadAssets() {
      try {
        const response = await fetch("/api/assets");
        const data = (await response.json()) as AssetResponse;

        if (!response.ok) {
          throw new Error("Failed to load local assets");
        }

        setAssets({
          footage: Array.isArray(data.footage) ? data.footage : [],
          music: Array.isArray(data.music) ? data.music : [],
        });
      } catch (requestError) {
        setAssetError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load local assets."
        );
      }
    }

    loadAssets();
  }, []);

  useEffect(() => {
    setRenderError(null);
    setRenderOutput(null);
  }, [selectedFootage, selectedMusic, selectedTemplateId, renderSettings]);

  const scriptLines = useMemo(() => normalizeScript(result?.script), [result]);
  const hashtags = useMemo(() => normalizeHashtags(result?.hashtags), [result]);
  const fullScriptText = useMemo(() => scriptLines.join("\n"), [scriptLines]);
  const hashtagText = useMemo(() => hashtags.join(" "), [hashtags]);
  const exportPayload = useMemo(
    () => ({
      input: form,
      result,
      stats: result
        ? calculateStats(result.hook || "", scriptLines, result.caption || "")
        : null,
    }),
    [form, result, scriptLines]
  );

  const stats = useMemo(
    () => calculateStats(result?.hook || "", scriptLines, result?.caption || ""),
    [result, scriptLines]
  );

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    await generateContent(1);
  }

  async function handleBatchGenerate() {
    await generateContent(batchCount);
  }

  async function generateContent(nextBatchCount: number) {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          batchCount: nextBatchCount,
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success
            ? data.detail || data.error || "Generator request failed"
            : "Generator request failed"
        );
      }

      if ("results" in data) {
        setBatchResults(data.results);
        setBatchGeneratedAt(new Date().toISOString());
        setResult(data.results[0] || null);
        setActiveTab("script");
        setRenderError(null);
        setRenderOutput(null);
        saveGenerations(form, data.results);
      } else {
        setResult(data.result);
        setBatchResults([]);
        setBatchGeneratedAt(null);
        setActiveTab("script");
        setRenderError(null);
        setRenderOutput(null);
        saveGeneration(form, data.result);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate content right now.";

      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function saveGeneration(input: FormState, generated: GeneratedResult) {
    saveGenerations(input, [generated]);
  }

  function saveGenerations(input: FormState, generatedItems: GeneratedResult[]) {
    const item: Omit<HistoryItem, "result"> = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`,
      createdAt: new Date().toISOString(),
      form: input,
    };
    const nextItems = generatedItems.map((generated, index) => ({
      ...item,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${index}`,
      result: generated,
    }));
    setHistory((currentHistory) => {
      const nextHistory = [...nextItems, ...currentHistory].slice(0, 10);
      window.localStorage.setItem(
        historyStorageKey,
        JSON.stringify(nextHistory)
      );
      return nextHistory;
    });
  }

  async function copyText(key: string, text: string) {
    if (!text.trim()) {
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1400);
  }

  function exportFile(type: "txt" | "json") {
    if (!result) {
      return;
    }

    const content =
      type === "json"
        ? JSON.stringify(exportPayload, null, 2)
        : buildTxtExport(form, result, scriptLines, hashtags);
    const blob = new Blob([content], {
      type: type === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `noesaaid-reel-${new Date()
      .toISOString()
      .slice(0, 10)}.${type}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportGeneratedResult(
    target: GeneratedResult,
    type: "txt" | "json"
  ) {
    const targetScriptLines = normalizeScript(target.script);
    const targetHashtags = normalizeHashtags(target.hashtags);
    const payload = {
      input: form,
      result: target,
      stats: calculateStats(target.hook || "", targetScriptLines, target.caption || ""),
    };
    const content =
      type === "json"
        ? JSON.stringify(payload, null, 2)
        : buildTxtExport(form, target, targetScriptLines, targetHashtags);
    const blob = new Blob([content], {
      type: type === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `noesaaid-reel-${new Date()
      .toISOString()
      .slice(0, 10)}.${type}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function applyPreset(preset: (typeof anglePresets)[number]) {
    setForm((current) => ({
      ...current,
      category:
        selectedPreset.categories[preset.categoryIndex] ||
        selectedPreset.categories[0],
      tone: selectedPreset.tones[preset.toneIndex] || selectedPreset.tones[0],
      topic: current.topic.includes(preset.label)
        ? current.topic
        : `${current.topic} - ${preset.label} angle`,
    }));
  }

  function selectPreset(presetId: string) {
    const nextPreset = getClientPreset(presetId);

    setForm({
      presetId: nextPreset.id,
      topic: nextPreset.defaultTopic,
      category: nextPreset.categories[0],
      platform: nextPreset.platforms[0],
      tone: nextPreset.tones[0],
    });
    setResult(null);
    setBatchResults([]);
    setBatchGeneratedAt(null);
    setError(null);
    setRenderError(null);
    setRenderOutput(null);
  }

  function loadHistory(item: HistoryItem) {
    setForm(normalizeFormState(item.form));
    setResult(item.result);
    setBatchResults([]);
    setBatchGeneratedAt(null);
    setError(null);
    setRenderError(null);
    setRenderOutput(null);
    setActiveTab("script");
  }

  async function handleRender() {
    if (!result || scriptLines.length === 0) {
      setRenderError("Generate a script before rendering a reel.");
      return;
    }

    await renderGeneratedResult(result);
  }

  async function renderGeneratedResult(target: GeneratedResult) {
    const targetScriptLines = normalizeScript(target.script);
    if (targetScriptLines.length === 0) {
      setRenderError("Generate a script before rendering a reel.");
      return;
    }

    setIsRendering(true);
    setRenderError(null);
    setRenderOutput(null);

    try {
      const response = await fetch("/api/render-reel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...target,
          footageFile: selectedFootage || undefined,
          musicFile: selectedMusic || undefined,
          templateId: selectedTemplateId,
          ...renderSettings,
        }),
      });
      const data = (await response.json()) as RenderResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success
            ? data.detail || data.error || "Render request failed"
            : "Render request failed"
        );
      }

      setRenderOutput(data.output);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to render reel right now.";
      setRenderError(message);
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070907] text-zinc-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border border-lime-300/30 bg-lime-300/10 text-lime-200">
              <Trophy className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-lime-200">
                NoesaaID AI
              </p>
              <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
                NoesaaID Reels Engine
              </h1>
            </div>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">
            <BadgeCheck className="size-4 text-lime-200" aria-hidden="true" />
            MiMo connected
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="grid h-fit gap-5">
            <motion.form
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              onSubmit={handleSubmit}
              className="rounded-lg border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/30 sm:p-6"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-lime-200">
                    Content brief
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Generate one short-form script
                  </h2>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200">
                  <Wand2 className="size-5" aria-hidden="true" />
                </div>
              </div>

              <div className="mb-5 grid gap-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Engine preset
                  </span>
                  <select
                    value={form.presetId}
                    onChange={(event) => selectPreset(event.target.value)}
                    className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/20"
                  >
                    {reelPresets.map((preset) => (
                      <option
                        key={preset.id}
                        value={preset.id}
                        className="bg-zinc-950"
                      >
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-sm leading-6 text-zinc-400">
                  {selectedPreset.description}
                </p>
              </div>

              <div className="mb-5">
                <p className="mb-2 text-sm font-medium text-zinc-300">
                  Quick angles
                </p>
                <div className="flex flex-wrap gap-2">
                  {anglePresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-lime-300/40 hover:bg-lime-300/10 hover:text-lime-100"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Topic
                  </span>
                  <textarea
                    value={form.topic}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        topic: event.target.value,
                      }))
                    }
                    rows={4}
                    required
                    minLength={3}
                    className="min-h-28 resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/20"
                    placeholder={selectedPreset.defaultTopic}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Category"
                    value={form.category}
                    options={selectedPreset.categories}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, category: value }))
                    }
                  />
                  <SelectField
                    label="Platform"
                    value={form.platform}
                    options={selectedPreset.platforms}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, platform: value }))
                    }
                  />
                </div>

                <SelectField
                  label="Tone"
                  value={form.tone}
                  options={selectedPreset.tones}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, tone: value }))
                  }
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-lime-300 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                        Generating
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" aria-hidden="true" />
                        Generate
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => handleSubmit()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-zinc-100 transition hover:border-lime-300/40 hover:bg-lime-300/10 disabled:cursor-not-allowed disabled:text-zinc-500"
                  >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Generate Again
                  </button>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-zinc-300">
                        Batch mode
                      </span>
                      <select
                        value={batchCount}
                        onChange={(event) =>
                          setBatchCount(Number(event.target.value) as typeof batchCount)
                        }
                        className="h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/20"
                      >
                        {batchCounts.map((count) => (
                          <option
                            key={count}
                            value={count}
                            className="bg-zinc-950"
                          >
                            {count} ideas
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleBatchGenerate}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-lime-300/30 bg-lime-300/10 px-4 text-sm font-semibold text-lime-100 transition hover:bg-lime-300/20 disabled:cursor-not-allowed disabled:text-zinc-500"
                    >
                      {isGenerating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      Generate Batch
                    </button>
                  </div>
                  <p className="text-xs leading-5 text-zinc-400">
                    Creates multiple concise concepts from the same topic. Each
                    card can be copied, exported, or rendered individually.
                  </p>
                </div>
              </div>
            </motion.form>

            <AssetsPanel
              assets={assets}
              assetError={assetError}
              selectedFootage={selectedFootage}
              selectedMusic={selectedMusic}
              onSelectFootage={setSelectedFootage}
              onSelectMusic={setSelectedMusic}
            />

            <TemplatesPanel
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={setSelectedTemplateId}
            />

            <RenderSettingsPanel
              settings={renderSettings}
              onChange={setRenderSettings}
            />

            <HistoryPanel history={history} onLoad={loadHistory} />
          </div>

          <div className="grid gap-5">
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-red-400/30 bg-red-950/40 p-5 text-red-100"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="font-semibold">Generation failed</h2>
                    <p className="mt-1 text-sm text-red-100/80">{error}</p>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {isGenerating ? <LoadingArena /> : null}
            {isRendering ? <RenderLoadingCard /> : null}
            {renderError ? (
              <StatusCard
                tone="error"
                title="Render failed"
                detail={renderError}
                icon={<AlertTriangle className="size-5" />}
              />
            ) : null}
            {renderOutput ? (
              <StatusCard
                tone="success"
                title="MP4 exported"
                detail={`${renderOutput.publicPath} (${renderOutput.templateName}, ${renderOutput.duration}s, ${renderOutput.subtitleCount} subtitles)`}
                icon={<FileVideo className="size-5" />}
                action={
                  <a
                    href={renderOutput.downloadUrl}
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-300/20"
                  >
                    <Download className="size-4" />
                    Download MP4
                  </a>
                }
              />
            ) : null}

            {batchResults.length > 0 ? (
              <BatchResultsSection
                results={batchResults}
                generatedAt={batchGeneratedAt}
                onSelect={(item) => {
                  setResult(item);
                  setActiveTab("script");
                  setRenderOutput(null);
                  setRenderError(null);
                }}
                onCopy={(item, index) =>
                  copyText(`batch-${index}`, JSON.stringify(item, null, 2))
                }
                onRender={renderGeneratedResult}
                onExport={exportGeneratedResult}
                copiedKey={copiedKey}
                isRendering={isRendering}
              />
            ) : null}

            {result ? (
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="grid gap-5"
              >
                <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-lime-200">
                        Generated output
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-white">
                        {result.title || "Untitled reel"}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        icon={
                          isRendering ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Clapperboard className="size-4" />
                          )
                        }
                        label={isRendering ? "Rendering" : "Render Reel"}
                        onClick={handleRender}
                        disabled={isRendering || isGenerating}
                      />
                      <ActionButton
                        icon={<Download className="size-4" />}
                        label="Export TXT"
                        onClick={() => exportFile("txt")}
                      />
                      <ActionButton
                        icon={<FileJson className="size-4" />}
                        label="Export JSON"
                        onClick={() => exportFile("json")}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                      icon={<Timer className="size-4" />}
                      label="Duration"
                      value={`${stats.durationSeconds}s`}
                    />
                    <StatCard
                      icon={<ShieldCheck className="size-4" />}
                      label="Hook strength"
                      value={stats.hookStrength}
                    />
                    <StatCard
                      icon={<Zap className="size-4" />}
                      label="Retention"
                      value={`${stats.retentionScore}%`}
                    />
                    <StatCard
                      icon={<Captions className="size-4" />}
                      label="Subtitle lines"
                      value={`${stats.subtitleLineCount}`}
                    />
                  </div>
                </div>

                <ResultBlock
                  icon={<Megaphone className="size-5" aria-hidden="true" />}
                  label="Hook"
                  value={result.hook}
                  action={
                    <CopyButton
                      copied={copiedKey === "hook"}
                      onClick={() => copyText("hook", result.hook || "")}
                    />
                  }
                  highlight
                />

                <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-lime-200">
                      <Play className="size-5" aria-hidden="true" />
                      <h2 className="text-sm font-semibold uppercase tracking-wide">
                        Output
                      </h2>
                    </div>
                    <div className="flex rounded-lg border border-white/10 bg-black/30 p-1">
                      {resultTabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                            activeTab === tab.id
                              ? "bg-lime-300 text-zinc-950"
                              : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ResultTabContent
                    activeTab={activeTab}
                    result={result}
                    scriptLines={scriptLines}
                    hashtags={hashtags}
                    copiedKey={copiedKey}
                    onCopy={copyText}
                  />
                </div>
              </motion.section>
            ) : (
              <EmptyState />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ResultTabContent({
  activeTab,
  result,
  scriptLines,
  hashtags,
  copiedKey,
  onCopy,
}: {
  activeTab: ResultTab;
  result: GeneratedResult;
  scriptLines: string[];
  hashtags: string[];
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  if (activeTab === "caption") {
    return (
      <div className="grid gap-3">
        <div className="flex justify-end">
          <CopyButton
            copied={copiedKey === "caption"}
            onClick={() => onCopy("caption", result.caption || "")}
          />
        </div>
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-base leading-7 text-zinc-100">
          {result.caption || "No caption returned."}
        </p>
      </div>
    );
  }

  if (activeTab === "hashtags") {
    return (
      <div className="grid gap-3">
        <div className="flex justify-end">
          <CopyButton
            copied={copiedKey === "hashtags"}
            onClick={() => onCopy("hashtags", hashtags.join(" "))}
          />
        </div>
        {hashtags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm font-medium text-emerald-100"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No hashtags returned.</p>
        )}
      </div>
    );
  }

  if (activeTab === "preview") {
    return (
      <div className="rounded-lg border border-white/10 bg-black/40 p-4">
        <div className="mx-auto flex aspect-[9/16] max-h-[560px] min-h-[420px] w-full max-w-[315px] flex-col justify-between overflow-hidden rounded-lg border border-lime-300/20 bg-gradient-to-b from-zinc-900 via-[#101710] to-black p-5 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between text-xs font-semibold text-lime-200">
            <span>NOESAAID</span>
            <span>REELS</span>
          </div>
          <div>
            <p className="text-2xl font-bold leading-tight text-white">
              {result.hook || result.title || "Your hook appears here"}
            </p>
            <div className="mt-4 h-1.5 w-24 rounded-full bg-lime-300" />
          </div>
          <div className="rounded-lg bg-black/60 p-3 text-sm leading-6 text-zinc-100">
            {scriptLines[0] || result.caption || "Generated script preview"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <CopyButton
          copied={copiedKey === "script"}
          onClick={() => onCopy("script", scriptLines.join("\n"))}
        />
      </div>
      {scriptLines.length > 0 ? (
        <ol className="grid gap-3">
          {scriptLines.map((line, index) => (
            <li
              key={`${line}-${index}`}
              className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-zinc-200 sm:text-base"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-lime-300/10 text-xs font-bold text-lime-200">
                {index + 1}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-zinc-400">No script returned.</p>
      )}
    </div>
  );
}

function BatchResultsSection({
  results,
  generatedAt,
  onSelect,
  onCopy,
  onRender,
  onExport,
  copiedKey,
  isRendering,
}: {
  results: GeneratedResult[];
  generatedAt: string | null;
  onSelect: (result: GeneratedResult) => void;
  onCopy: (result: GeneratedResult, index: number) => void;
  onRender: (result: GeneratedResult) => void;
  onExport: (result: GeneratedResult, type: "txt" | "json") => void;
  copiedKey: string | null;
  isRendering: boolean;
}) {
  const totalDuration = results.reduce((sum, item) => {
    const lines = normalizeScript(item.script);
    return sum + calculateStats(item.hook || "", lines, item.caption || "").durationSeconds;
  }, 0);

  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-lime-200">Batch concepts</p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {results.length} generated reel ideas
          </h2>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-5 text-zinc-300">
          <p>{results.length} possible renders</p>
          <p>~{totalDuration}s total</p>
          <p>{generatedAt ? new Date(generatedAt).toLocaleString() : "Just now"}</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {results.map((item, index) => (
          <article
            key={`${item.title || "batch"}-${index}`}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-lime-200">
                  Idea {index + 1}
                </p>
                <h3 className="mt-1 line-clamp-2 text-base font-semibold text-white">
                  {item.title || "Untitled reel"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs font-medium text-zinc-200 transition hover:border-lime-300/40 hover:text-lime-100"
              >
                Open
              </button>
            </div>
            <p className="line-clamp-3 text-sm leading-6 text-zinc-300">
              {item.hook || normalizeScript(item.script)[0] || item.caption}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton
                icon={
                  copiedKey === `batch-${index}` ? (
                    <Check className="size-4" />
                  ) : (
                    <Clipboard className="size-4" />
                  )
                }
                label={copiedKey === `batch-${index}` ? "Copied" : "Copy"}
                onClick={() => onCopy(item, index)}
              />
              <ActionButton
                icon={
                  isRendering ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Clapperboard className="size-4" />
                  )
                }
                label="Render"
                onClick={() => onRender(item)}
                disabled={isRendering}
              />
              <ActionButton
                icon={<Download className="size-4" />}
                label="TXT"
                onClick={() => onExport(item, "txt")}
              />
              <ActionButton
                icon={<FileJson className="size-4" />}
                label="JSON"
                onClick={() => onExport(item, "json")}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LoadingArena() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-lg border border-lime-300/20 bg-zinc-950/80 p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-lime-200">AI studio live</p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Building your reel angle
          </h2>
        </div>
        <Loader2 className="size-5 animate-spin text-lime-200" />
      </div>
      <div className="relative h-24 rounded-lg border border-white/10 bg-black/30">
        <div className="absolute inset-x-4 top-1/2 h-px bg-white/10" />
        <div className="absolute left-4 right-4 top-1/2 h-10 -translate-y-1/2 rounded-full border border-white/10" />
        <motion.div
          animate={{ x: ["0%", "88%", "0%"], rotate: [0, 360, 720] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-4 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-lime-300/50 bg-lime-300 text-sm font-black text-zinc-950"
        >
          AI
        </motion.div>
      </div>
    </motion.div>
  );
}

function RenderLoadingCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-emerald-300/20 bg-zinc-950/80 p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-200">
            FFmpeg renderer
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Exporting vertical MP4
          </h2>
        </div>
        <Clapperboard className="size-5 text-emerald-200" />
      </div>
      <div className="grid gap-2">
        {["Center crop footage", "Apply dark readability overlay", "Burn subtitles", "Encode MP4"].map(
          (step, index) => (
            <div
              key={step}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
            >
              <motion.span
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  delay: index * 0.16,
                }}
                className="size-2 rounded-full bg-emerald-300"
              />
              {step}
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}

function StatusCard({
  tone,
  title,
  detail,
  icon,
  action,
}: {
  tone: "success" | "error";
  title: string;
  detail: string;
  icon: ReactNode;
  action?: ReactNode;
}) {
  const classes =
    tone === "success"
      ? "border-emerald-300/30 bg-emerald-950/35 text-emerald-100"
      : "border-red-400/30 bg-red-950/40 text-red-100";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-5 ${classes}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 break-all text-sm opacity-85">{detail}</p>
          {action}
        </div>
      </div>
    </motion.div>
  );
}

function AssetsPanel({
  assets,
  assetError,
  selectedFootage,
  selectedMusic,
  onSelectFootage,
  onSelectMusic,
}: {
  assets: AssetResponse;
  assetError: string | null;
  selectedFootage: string;
  selectedMusic: string;
  onSelectFootage: (value: string) => void;
  onSelectMusic: (value: string) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/70 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-lime-200">
          <FolderOpen className="size-5" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Local assets
          </h2>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-zinc-300">
          {assets.footage.length} footage / {assets.music.length} music
        </span>
      </div>

      {assetError ? (
        <p className="mb-4 rounded-md border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-100">
          {assetError}
        </p>
      ) : null}

      <div className="grid gap-4">
        <AssetSelect
          label="Footage"
          value={selectedFootage}
          assets={assets.footage}
          fallbackLabel="Auto footage / black fallback"
          onChange={onSelectFootage}
        />
        <AssetSelect
          label="Music"
          value={selectedMusic}
          assets={assets.music}
          fallbackLabel="Auto music / silent fallback"
          onChange={onSelectMusic}
        />
      </div>
    </section>
  );
}

function AssetSelect({
  label,
  value,
  assets,
  fallbackLabel,
  onChange,
}: {
  label: string;
  value: string;
  assets: AssetFile[];
  fallbackLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/20"
      >
        <option value="" className="bg-zinc-950">
          {fallbackLabel}
        </option>
        {assets.map((asset) => (
          <option key={asset.name} value={asset.name} className="bg-zinc-950">
            {asset.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function TemplatesPanel({
  selectedTemplateId,
  onSelectTemplate,
}: {
  selectedTemplateId: string;
  onSelectTemplate: (value: string) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-lime-200">
          <Clapperboard className="size-5" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Video template
          </h2>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-zinc-300">
          {reelTemplates.length} templates
        </span>
      </div>

      <div className="grid gap-3">
        {reelTemplates.map((template) => {
          const isSelected = template.id === selectedTemplateId;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              className={`rounded-lg border p-3 text-left transition ${
                isSelected
                  ? "border-lime-300/50 bg-lime-300/10"
                  : "border-white/10 bg-white/[0.03] hover:border-lime-300/30 hover:bg-lime-300/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {template.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    {template.description}
                  </p>
                </div>
                <span
                  className="mt-1 size-4 shrink-0 rounded-full border"
                  style={{
                    backgroundColor: `#${template.accentColor}`,
                    borderColor: `#${template.accentColor}`,
                  }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-300">
                <span className="rounded-md bg-black/30 px-2 py-1">
                  {template.textPosition}
                </span>
                <span className="rounded-md bg-black/30 px-2 py-1">
                  {template.pacing}
                </span>
                <span className="rounded-md bg-black/30 px-2 py-1">
                  {template.fontStyle.weight}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RenderSettingsPanel({
  settings,
  onChange,
}: {
  settings: RenderSettings;
  onChange: (settings: RenderSettings) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/70 p-5">
      <div className="mb-4 flex items-center gap-2 text-lime-200">
        <SlidersHorizontal className="size-5" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Render settings
        </h2>
      </div>

      <div className="grid gap-4">
        <SettingsSelect
          label="Duration"
          value={settings.durationMode}
          options={durationModes}
          onChange={(value) =>
            onChange({ ...settings, durationMode: value as RenderSettings["durationMode"] })
          }
        />
        <SettingsSelect
          label="Subtitle size"
          value={settings.subtitleSize}
          options={subtitleSizes}
          onChange={(value) =>
            onChange({ ...settings, subtitleSize: value as RenderSettings["subtitleSize"] })
          }
        />
        <SettingsSelect
          label="Quality"
          value={settings.quality}
          options={renderQualities}
          onChange={(value) =>
            onChange({ ...settings, quality: value as RenderSettings["quality"] })
          }
        />
      </div>
    </section>
  );
}

function SettingsSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm capitalize text-white outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/20"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-zinc-950">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function HistoryPanel({
  history,
  onLoad,
}: {
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/70 p-5">
      <div className="mb-4 flex items-center gap-2 text-lime-200">
        <History className="size-5" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Last 10 generations
        </h2>
      </div>
      {history.length > 0 ? (
        <div className="grid gap-2">
          {history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onLoad(item)}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-lime-300/30 hover:bg-lime-300/10"
            >
              <p className="line-clamp-1 text-sm font-semibold text-white">
                {item.result.title || item.form.topic}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {new Date(item.createdAt).toLocaleString()} - {item.form.platform}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-zinc-400">
          Your generated reels will be saved in this browser only.
        </p>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-white/15 bg-zinc-950/50 p-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-white/[0.05] text-lime-200">
          <Play className="size-5" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">
          Result will appear here
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Choose a preset, fill the brief, and generate a hook, script, caption,
          and hashtags for your next short-form video.
        </p>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/20"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-zinc-950">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultBlock({
  icon,
  label,
  value,
  action,
  highlight = false,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  action?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        highlight
          ? "border-lime-300/30 bg-lime-300/10"
          : "border-white/10 bg-zinc-950/80"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-lime-200">
          {icon}
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            {label}
          </h2>
        </div>
        {action}
      </div>
      <p className="text-base leading-7 text-zinc-100">
        {value || `No ${label.toLowerCase()} returned.`}
      </p>
    </div>
  );
}

function CopyButton({
  copied,
  onClick,
}: {
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 text-sm font-medium text-zinc-200 transition hover:border-lime-300/40 hover:bg-lime-300/10 hover:text-lime-100"
    >
      {copied ? (
        <Check className="size-4 text-lime-200" aria-hidden="true" />
      ) : (
        <Clipboard className="size-4" aria-hidden="true" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-zinc-200 transition hover:border-lime-300/40 hover:bg-lime-300/10 hover:text-lime-100 disabled:cursor-not-allowed disabled:text-zinc-500 disabled:hover:border-white/10 disabled:hover:bg-white/[0.04]"
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-2 text-lime-200">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function normalizeScript(script?: string[] | string) {
  if (!script) {
    return [];
  }

  return Array.isArray(script)
    ? script
    : script
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function normalizeHashtags(hashtags?: string[] | string) {
  if (!hashtags) {
    return [];
  }

  const tags = Array.isArray(hashtags)
    ? hashtags
    : hashtags
        .split(/[,\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean);

  return tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}

function calculateStats(hook: string, scriptLines: string[], caption: string) {
  const wordCount = scriptLines.join(" ").split(/\s+/).filter(Boolean).length;
  const durationSeconds = Math.max(8, Math.round(wordCount / 2.7));
  const subtitleLineCount = scriptLines.length;
  const hookWords = hook.split(/\s+/).filter(Boolean).length;
  const hasQuestion = hook.includes("?");
  const hasTension = /jangan|stop|salah|kalah|malu|kasihan|rahasia/i.test(hook);
  const hookScore = Math.min(
    100,
    42 + hookWords * 4 + (hasQuestion ? 16 : 0) + (hasTension ? 18 : 0)
  );
  const retentionScore = Math.min(
    98,
    Math.round(hookScore * 0.48 + Math.min(scriptLines.length, 10) * 4 + 22)
  );

  return {
    durationSeconds,
    subtitleLineCount,
    hookStrength:
      hookScore >= 82 ? "Strong" : hookScore >= 64 ? "Good" : "Needs work",
    retentionScore: caption.length > 80 ? retentionScore : retentionScore - 5,
  };
}

function buildTxtExport(
  input: FormState,
  result: GeneratedResult,
  scriptLines: string[],
  hashtags: string[]
) {
  return [
    "NoesaaID Reels Engine",
    "",
    `Preset: ${getClientPreset(input.presetId).name}`,
    `Topic: ${input.topic}`,
    `Category: ${input.category}`,
    `Platform: ${input.platform}`,
    `Tone: ${input.tone}`,
    "",
    `Title: ${result.title || ""}`,
    "",
    `Hook: ${result.hook || ""}`,
    "",
    "Script:",
    ...scriptLines.map((line, index) => `${index + 1}. ${line}`),
    "",
    `Caption: ${result.caption || ""}`,
    "",
    `Hashtags: ${hashtags.join(" ")}`,
  ].join("\n");
}

function getClientPreset(presetId: string | undefined): ReelPreset {
  return (
    reelPresets.find((preset) => preset.id === presetId) ||
    reelPresets.find((preset) => preset.id === defaultPresetId) ||
    reelPresets[0]
  );
}

function normalizeFormState(form: Partial<FormState>): FormState {
  const preset = getClientPreset(form.presetId);

  return {
    presetId: preset.id,
    topic: form.topic || preset.defaultTopic,
    category:
      form.category && preset.categories.includes(form.category)
        ? form.category
        : preset.categories[0],
    platform:
      form.platform && preset.platforms.includes(form.platform)
        ? form.platform
        : preset.platforms[0],
    tone:
      form.tone && preset.tones.includes(form.tone)
        ? form.tone
        : preset.tones[0],
  };
}
