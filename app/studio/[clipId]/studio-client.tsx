"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Lightbulb,
  Loader2,
  Music,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  defaultCaptionStyleParams,
  type CaptionStyleParams,
  type CaptionFontColor,
  type CaptionFontSize,
  type CaptionBackground,
  type CaptionPosition,
} from "@/app/lib/render-settings";
import EmojiPicker from "@/app/components/emoji-picker";
import MusicPicker from "@/app/components/music-picker";

type ClipData = {
  filename: string | null;
  downloadUrl: string | null;
  previewUrl: string | null;
  score: number;
  hook: string;
  title: string;
  caption: string;
  hashtags: string[];
  startTime: number;
  endTime: number;
  platform?: string;
  words?: Array<{ word: string; start: number; end: number }>;
};

type StudioRenderResponse =
  | {
      success: true;
      output: { filename: string; downloadUrl: string; duration: number };
    }
  | {
      success: false;
      error?: string;
      detail?: string;
    };

type GenerateScriptResponse =
  | {
      success: true;
      result: {
        hook: string;
        caption: string;
        hashtags: string[];
      };
    }
  | {
      success: false;
      error?: string;
      detail?: string;
    };

const fontColors: Array<{ value: CaptionFontColor; dot: string }> = [
  { value: "#FFFFFF", dot: "#FFFFFF" },
  { value: "#FFE600", dot: "#FFE600" },
  { value: "#00FFFF", dot: "#00FFFF" },
  { value: "#FF8C00", dot: "#FF8C00" },
  { value: "#FF69B4", dot: "#FF69B4" },
];

const fontSizeOpts: Array<{ value: CaptionFontSize; label: string }> = [
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
];

const backgroundOpts: Array<{
  value: CaptionBackground;
  label: string;
}> = [
  { value: "none", label: "None" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Blur" },
];

const positionOpts: Array<{ value: CaptionPosition; icon: string }> = [
  { value: "top", icon: "↑" },
  { value: "center", icon: "↕" },
  { value: "bottom", icon: "↓" },
];

const effectOpts = [
  { value: "fade" as const, label: "Fade" },
  { value: "pop" as const, label: "Pop" },
  { value: "slide-up" as const, label: "Slide↑" },
  { value: "karaoke" as const, label: "Karaoke" },
];

export default function StudioClient() {
  const [clip, setClip] = useState<ClipData | null>(null);
  const [sourcePath, setSourcePath] = useState("");
  const [hook, setHook] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [styleParams, setStyleParams] = useState<CaptionStyleParams>(
    defaultCaptionStyleParams
  );
  const [originalUrl, setOriginalUrl] = useState("");
  const [finalUrl, setFinalUrl] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderStep, setRenderStep] = useState("");
  const [error, setError] = useState("");
  const [aiSuccess, setAiSuccess] = useState(false);
  const [selectedMusicFile, setSelectedMusicFile] = useState<string | null>(
    null
  );
  const [musicVolume, setMusicVolume] = useState(30);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [captionEffect, setCaptionEffect] = useState<
    "fade" | "pop" | "slide-up" | "karaoke"
  >("fade");

  const hookRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("studio-clip");
      const storedSource = sessionStorage.getItem("studio-source");

      if (!stored || !storedSource) {
        window.location.href = "/clips";
        return;
      }

      const parsed = JSON.parse(stored) as ClipData;
      setClip(parsed);
      setSourcePath(storedSource);
      setOriginalUrl(parsed.downloadUrl || parsed.previewUrl || "");
    } catch {
      window.location.href = "/clips";
    }
  }, []);

  function containsEmoji(text: string): boolean {
  return /[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);
}

function insertAtCursor(
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    value: string,
    setter: (v: string) => void,
    current: string
  ) {
    const el = ref.current;
    if (!el) {
      setter(current + value);
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + value + current.slice(end);
    setter(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + value.length, start + value.length);
    });
  }

  async function generateWithAI() {
    if (!clip) return;

    setIsGeneratingAI(true);
    setError("");
    setAiSuccess(false);

    try {
      const duration = clip.endTime - clip.startTime;

      const response = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipTitle: clip.title,
          platform: clip.platform || "reels",
          duration: Math.round(duration),
          words: clip.words,
        }),
      });

      const data = (await response.json()) as GenerateScriptResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success ? data.detail || data.error : "AI generation failed"
        );
      }

      setHook(data.result.hook);
      setCaption(data.result.caption);
      setHashtags(data.result.hashtags.join(", "));
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed.");
    } finally {
      setIsGeneratingAI(false);
    }
  }

  async function generateFinalClip() {
    if (!clip || !sourcePath) return;

    setIsRendering(true);
    setRenderStep("Preparing clip data...");
    setError("");

    const stepTimer = window.setTimeout(
      () => setRenderStep("Rendering with FFmpeg..."),
      1500
    );

    try {
      const clipId =
        clip.filename?.replace(".mp4", "") || `clip-${Date.now()}`;
      const duration = clip.endTime - clip.startTime;

      const response = await fetch("/api/studio/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath,
          candidate: {
            id: clipId,
            title: clip.title,
            startTime: clip.startTime,
            endTime: clip.endTime,
            duration,
            score: clip.score,
            reason: "Studio re-render",
            platform: clip.platform || "reels",
            suggestedHook: hook,
            suggestedCaption: caption,
            suggestedHashtags: hashtags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            visualPlan: {
              aspectMode: "vertical",
              framing: "balanced",
              motionNote: "",
              subtitleNote: "",
            },
          },
          captionStyleParams: styleParams,
          hook,
          caption,
          musicPath: musicEnabled ? (selectedMusicFile ?? undefined) : undefined,
          musicVolume: musicEnabled ? musicVolume : undefined,
          captionEffect,
        }),
      });

      const data = (await response.json()) as StudioRenderResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success ? data.detail || data.error : "Render failed"
        );
      }

      setFinalUrl(data.output.downloadUrl);
      setRenderStep("Done!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render failed.");
    } finally {
      window.clearTimeout(stepTimer);
      setIsRendering(false);
      setRenderStep("");
    }
  }

  function updateStyle<K extends keyof CaptionStyleParams>(
    key: K,
    value: CaptionStyleParams[K]
  ) {
    setStyleParams((prev) => ({ ...prev, [key]: value }));
  }

  if (!clip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="size-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  const hasWords = clip.words && clip.words.length > 0;

  return (
    <section className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/clips"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            <ArrowLeft className="size-4" />
            Back to clips
          </Link>
        </motion.div>

        {/* Main Layout */}
        <div
          className={`grid gap-6 ${finalUrl ? "lg:grid-cols-[55%_1fr]" : "lg:grid-cols-[45%_1fr]"}`}
        >
          {/* Video Comparison */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <div
              className={`grid gap-3 ${finalUrl ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
            >
              {/* Original */}
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                <div className="relative">
                  {originalUrl ? (
                    <video
                      src={originalUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="aspect-[9/16] w-full bg-black object-contain"
                    />
                  ) : (
                    <div className="flex aspect-[9/16] items-center justify-center bg-black">
                      <p className="text-sm text-zinc-600">No video</p>
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-md bg-zinc-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300 backdrop-blur-sm">
                    Original
                  </span>
                </div>
              </div>

              {/* Final — only shown after render */}
              {finalUrl ? (
                <div className="overflow-hidden rounded-xl border border-cyan-400/30 bg-zinc-950">
                  <div className="relative">
                    <video
                      src={finalUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="aspect-[9/16] w-full bg-black object-contain"
                    />
                    <span className="absolute left-2 top-2 rounded-md bg-cyan-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black backdrop-blur-sm">
                      Final
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Clip info bar */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 uppercase">
                  {clip.platform || "reels"}
                </span>
                <span className="text-xs text-zinc-500">
                  {clip.startTime}s &ndash; {clip.endTime}s
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                    hasWords
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {hasWords ? "Transcript available" : "No transcript"}
                </span>
              </div>
              <span className="rounded-lg bg-cyan-400 px-2.5 py-1 text-sm font-bold text-black">
                {clip.score}
              </span>
            </div>

            {/* Action buttons — shown after render */}
            {finalUrl && !isRendering ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-2"
              >
                <a
                  href={finalUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-cyan-300"
                >
                  <Download className="size-3.5" />
                  Download Final
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setFinalUrl("");
                    void generateFinalClip();
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                >
                  <RotateCcw className="size-3.5" />
                  Generate Again
                </button>
                <Link
                  href="/clips"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-5 py-2.5 text-xs font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to clips
                </Link>
              </motion.div>
            ) : null}
          </motion.div>

          {/* Right Panel — Script Editor */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold text-white">
                {clip.title}
              </h2>
            </div>

            {/* AI Generate Button */}
            <button
              type="button"
              disabled={isGeneratingAI}
              onClick={() => void generateWithAI()}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/5 text-xs font-medium text-cyan-400 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Lightbulb className="size-3.5" />
                  Generate with AI
                </>
              )}
            </button>

            {/* AI Success Banner */}
            {aiSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-400"
              >
                AI content generated. Edit as needed.
              </motion.div>
            ) : null}

            {/* Hook */}
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase text-zinc-500">
                Hook
              </label>
              <input
                ref={hookRef}
                type="text"
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                maxLength={80}
                placeholder="Opening line..."
                className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none transition focus:border-cyan-400/50"
              />
              <EmojiPicker
                onSelect={(char) =>
                  insertAtCursor(hookRef, char, setHook, hook)
                }
              />
              {containsEmoji(hook) ? (
                <p className="mt-1 text-[10px] text-amber-400/80">
                  Emoji akan dihapus dari video, tetap ada di caption untuk posting
                </p>
              ) : null}
            </div>

            {/* Caption */}
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase text-zinc-500">
                Caption
              </label>
              <textarea
                ref={captionRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={300}
                placeholder="Write a caption..."
                rows={3}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white outline-none transition focus:border-cyan-400/50"
              />
              <EmojiPicker
                onSelect={(char) =>
                  insertAtCursor(captionRef, char, setCaption, caption)
                }
              />
              {containsEmoji(caption) ? (
                <p className="mt-1 text-[10px] text-amber-400/80">
                  Emoji akan dihapus dari video, tetap ada di caption untuk posting
                </p>
              ) : null}
            </div>

            {/* Hashtags */}
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase text-zinc-500">
                Hashtags
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#football, #futsal"
                className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none transition focus:border-cyan-400/50"
              />
            </div>

            {/* === Compact Style Controls === */}
            <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              <div className="space-y-3 p-3">
                {/* Color */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500">
                    Color
                  </p>
                  <div className="flex gap-1.5">
                    {fontColors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => updateStyle("fontColor", c.value)}
                        className={`size-7 rounded-md border transition ${
                          styleParams.fontColor === c.value
                            ? "border-cyan-400/60 bg-cyan-400/15"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        <span
                          className="mx-auto block size-3 rounded-full"
                          style={{ backgroundColor: c.dot }}
                        />
                      </button>
                    ))}
                    <input
                      type="text"
                      value={styleParams.fontColor}
                      onChange={(e) =>
                        updateStyle(
                          "fontColor",
                          e.target.value as CaptionFontColor
                        )
                      }
                      className="h-7 w-16 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 text-[10px] text-zinc-400 outline-none transition focus:border-cyan-400/50"
                      maxLength={7}
                    />
                  </div>
                </div>

                {/* Size */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500">
                    Size
                  </p>
                  <div className="flex gap-1.5">
                    {fontSizeOpts.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => updateStyle("fontSize", o.value)}
                        className={`h-7 min-w-8 rounded-md border px-3 text-[11px] font-medium transition ${
                          styleParams.fontSize === o.value
                            ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500">
                    Background
                  </p>
                  <div className="flex gap-1.5">
                    {backgroundOpts.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => updateStyle("background", o.value)}
                        className={`h-7 rounded-md border px-3 text-[11px] font-medium transition ${
                          styleParams.background === o.value
                            ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption Position */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500">
                    Caption Pos
                  </p>
                  <div className="flex gap-1.5">
                    {positionOpts.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => updateStyle("position", o.value)}
                        className={`h-7 min-w-12 rounded-md border px-3 text-[11px] font-medium transition ${
                          styleParams.position === o.value
                            ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        {o.icon}{" "}
                        {o.value === "center"
                          ? "Mid"
                          : o.value === "top"
                            ? "Top"
                            : "Bot"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hook Position */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500">
                    Hook Pos
                  </p>
                  <div className="flex gap-1.5">
                    {positionOpts.map((o) => (
                      <button
                        key={`hook-${o.value}`}
                        type="button"
                        onClick={() => updateStyle("hookPosition", o.value)}
                        className={`h-7 min-w-12 rounded-md border px-3 text-[11px] font-medium transition ${
                          (styleParams.hookPosition || "top") === o.value
                            ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        {o.icon}{" "}
                        {o.value === "center"
                          ? "Mid"
                          : o.value === "top"
                            ? "Top"
                            : "Bot"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption Effect */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500">
                    Effect
                  </p>
                  <div className="flex gap-1.5">
                    {effectOpts.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setCaptionEffect(o.value)}
                        className={`h-7 rounded-md border px-3 text-[11px] font-medium transition ${
                          captionEffect === o.value
                            ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Music Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !musicEnabled;
                      setMusicEnabled(next);
                      if (!next) {
                        setSelectedMusicFile(null);
                        setMusicVolume(20);
                      }
                    }}
                    className={`flex h-8 w-full items-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition ${
                      musicEnabled
                        ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700"
                    }`}
                  >
                    <Music className="size-3.5" />
                    Music
                    <span className="ml-auto text-[10px] text-zinc-500">
                      {musicEnabled ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Selected track indicator */}
            {musicEnabled && selectedMusicFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2">
                <Music className="size-3.5 text-cyan-400" />
                <span className="min-w-0 flex-1 truncate text-xs text-cyan-400">
                  {selectedMusicFile.replace(/\.[^.]+$/, "")}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMusicFile(null)}
                  className="shrink-0 text-zinc-500 transition hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* Music Picker — expanded when enabled */}
            {musicEnabled ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <MusicPicker
                  selectedFilename={selectedMusicFile}
                  volume={musicVolume}
                  onSelect={setSelectedMusicFile}
                  onVolumeChange={setMusicVolume}
                />
              </motion.div>
            ) : null}

            {/* Error */}
            {error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-300"
              >
                {error}
              </motion.div>
            ) : null}

            {/* Generate Final Clip */}
            <button
              type="button"
              disabled={isRendering}
              onClick={() => void generateFinalClip()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {isRendering ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {renderStep || "Rendering..."}
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Generate Final Clip
                </>
              )}
            </button>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
