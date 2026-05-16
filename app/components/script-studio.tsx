"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  defaultPresetId,
  reelPresets,
  type ReelPreset,
} from "@/app/lib/presets";

type GeneratedResult = {
  hook?: string;
  title?: string;
  script?: string[] | string;
  caption?: string;
  hashtags?: string[] | string;
};

type FormState = {
  presetId: string;
  topic: string;
  category: string;
  platform: string;
  tone: string;
};

function getClientPreset(id: string | undefined): ReelPreset {
  return (
    reelPresets.find((p) => p.id === id) ||
    reelPresets.find((p) => p.id === defaultPresetId) ||
    reelPresets[0]
  );
}

function normalizeScript(script?: string[] | string): string[] {
  if (!script) return [];
  return Array.isArray(script)
    ? script
    : script
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
}

function normalizeHashtags(hashtags?: string[] | string): string[] {
  if (!hashtags) return [];
  const tags = Array.isArray(hashtags)
    ? hashtags
    : hashtags
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
  return tags.map((t) => (t.startsWith("#") ? t : `#${t}`));
}

export function ScriptStudio({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const preset = getClientPreset(defaultPresetId);
  const [form, setForm] = useState<FormState>({
    presetId: preset.id,
    topic: preset.defaultTopic,
    category: preset.categories[0],
    platform: preset.platforms[0],
    tone: preset.tones[0],
  });
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");
  const [activeTab, setActiveTab] = useState<"script" | "caption" | "hashtags">(
    "script"
  );

  const selectedPreset = getClientPreset(form.presetId);
  const scriptLines = normalizeScript(result?.script);
  const hashtags = normalizeHashtags(result?.hashtags);

  async function generate(event?: FormEvent) {
    event?.preventDefault();
    setIsGenerating(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, batchCount: 1 }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success ? data.detail || data.error : "Generation failed"
        );
      }

      setResult("results" in data ? data.results[0] : data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyText(key: string, text: string) {
    if (!text.trim()) return;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(""), 2000);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <button
        type="button"
        onClick={() => (onBack ? onBack() : router.push("/"))}
        className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
      >
        <ArrowLeft className="size-4" />
        Back to Clip Studio
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-12 text-center"
      >
        <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
          NoesaaID
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          AI Script Studio
        </h1>
        <p className="mt-3 text-base text-zinc-500">
          Generate hooks, scripts, and captions for short-form video.
        </p>
      </motion.div>

      <form onSubmit={generate} className="space-y-5">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-400">Preset</span>
          <select
            value={form.presetId}
            onChange={(e) => {
              const next = getClientPreset(e.target.value);
              setForm({
                presetId: next.id,
                topic: next.defaultTopic,
                category: next.categories[0],
                platform: next.platforms[0],
                tone: next.tones[0],
              });
            }}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-cyan-400/50"
          >
            {reelPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-400">Topic</span>
          <textarea
            value={form.topic}
            onChange={(e) =>
              setForm((f) => ({ ...f, topic: e.target.value }))
            }
            rows={3}
            required
            minLength={3}
            className="resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
            placeholder={selectedPreset.defaultTopic}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-400">Category</span>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-cyan-400/50"
            >
              {selectedPreset.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-400">Platform</span>
            <select
              value={form.platform}
              onChange={(e) =>
                setForm((f) => ({ ...f, platform: e.target.value }))
              }
              className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-cyan-400/50"
            >
              {selectedPreset.platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-400">Tone</span>
            <select
              value={form.tone}
              onChange={(e) =>
                setForm((f) => ({ ...f, tone: e.target.value }))
              }
              className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-cyan-400/50"
            >
              {selectedPreset.tones.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isGenerating}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isGenerating ? "Generating..." : "Generate Script"}
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void generate()}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-800 px-5 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-600"
          >
            <RefreshCw className="size-4" />
            Again
          </button>
        </div>
      </form>

      {/* Error */}
      {error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300"
        >
          {error}
        </motion.div>
      ) : null}

      {/* Results */}
      {result ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-8 space-y-5"
        >
          {/* Hook */}
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">
              Hook
            </p>
            <p className="text-base leading-relaxed text-white">
              {result.hook || "No hook returned."}
            </p>
          </div>

          {/* Tabs */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4 flex gap-1 rounded-lg bg-zinc-900 p-1">
              {(["script", "caption", "hashtags"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition ${
                    activeTab === tab
                      ? "bg-cyan-400 text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "script" ? (
              <div>
                <div className="mb-3 flex justify-end">
                  <CopyButton
                    copied={copiedKey === "script"}
                    onClick={() =>
                      void copyText("script", scriptLines.join("\n"))
                    }
                  />
                </div>
                {scriptLines.length > 0 ? (
                  <ol className="space-y-3">
                    {scriptLines.map((line, i) => (
                      <li
                        key={`${line}-${i}`}
                        className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm leading-relaxed text-zinc-300"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-cyan-400/10 text-xs font-bold text-cyan-400">
                          {i + 1}
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-zinc-600">No script returned.</p>
                )}
              </div>
            ) : null}

            {activeTab === "caption" ? (
              <div>
                <div className="mb-3 flex justify-end">
                  <CopyButton
                    copied={copiedKey === "caption"}
                    onClick={() =>
                      void copyText("caption", result.caption || "")
                    }
                  />
                </div>
                <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-300">
                  {result.caption || "No caption returned."}
                </p>
              </div>
            ) : null}

            {activeTab === "hashtags" ? (
              <div>
                <div className="mb-3 flex justify-end">
                  <CopyButton
                    copied={copiedKey === "hashtags"}
                    onClick={() =>
                      void copyText("hashtags", hashtags.join(" "))
                    }
                  />
                </div>
                {hashtags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600">
                    No hashtags returned.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </motion.section>
      ) : null}
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
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-white"
    >
      {copied ? (
        <Check className="size-3 text-cyan-400" />
      ) : (
        <Clipboard className="size-3" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
