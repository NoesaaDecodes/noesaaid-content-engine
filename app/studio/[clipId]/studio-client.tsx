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
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  defaultCaptionStyleParams,
  type CaptionStyleParams,
  type CaptionFontColor,
  type CaptionFontSize,
  type CaptionBackground,
  type CaptionPosition,
} from "@/app/lib/render-settings";
import { analyzeHookStrength, type HookAnalysis } from "@/app/lib/hooks/hook-analyzer";
import type { HookType } from "@/app/lib/hooks/hook-patterns";
import { TONE_PRESETS } from "@/app/lib/tones/tone-presets";
import { CTA_TYPES } from "@/app/lib/cta/cta-engine";
import { VISUAL_PRESETS, type VisualPreset } from "@/app/lib/presets/visual-presets";
import EmojiPicker from "@/app/components/emoji-picker";
import MusicPicker from "@/app/components/music-picker";
import BrandPresetManager from "@/app/components/brand-preset-manager";
import TimelineEditor from "@/app/components/timeline-editor";
import { showToast } from "@/app/components/toast";
import type { BrandPreset } from "@/app/lib/brand/brand-presets";

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
  insights?: string[];
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
  { value: "glow", label: "Glow" },
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
  { value: "bounce" as const, label: "Bounce" },
  { value: "punch" as const, label: "Punch" },
  { value: "shake" as const, label: "Shake" },
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
    "fade" | "pop" | "slide-up" | "karaoke" | "bounce" | "punch" | "shake"
  >("fade");
  const [hookAnalysis, setHookAnalysis] = useState<HookAnalysis | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteAlternatives, setRewriteAlternatives] = useState<
    Array<{ type: string; text: string; score: number }>
  >([]);
  const [selectedHookType, setSelectedHookType] = useState<HookType | "best">("best");
  const [selectedTone, setSelectedTone] = useState("auto");
  const [cta, setCta] = useState("");
  const [isGeneratingCTA, setIsGeneratingCTA] = useState(false);
  const [selectedCTAType, setSelectedCTAType] = useState("auto");
  const [patternSuggestions, setPatternSuggestions] = useState<
    Array<{ id: string; text: string; type: string; virality: number }>
  >([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [blurBackground, setBlurBackground] = useState(false);
  const [transcriptWords, setTranscriptWords] = useState<Array<{ word: string; start: number; end: number }>>([]);
  const [transcriptStatus, setTranscriptStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  // Order 15: Curiosity, B-Roll, Timeline
  const [curiosityHooks, setCuriosityHooks] = useState<{
    openLoop: string;
    delayedPayoff: string;
    mysteryPhrase: string;
    tensionLine: string;
  } | null>(null);
  const [isGeneratingCuriosity, setIsGeneratingCuriosity] = useState(false);
  const [brollSuggestions, setBrollSuggestions] = useState<
    Array<{ timestamp: number; keyword: string; suggestion: string; searchQuery: string; type: string }>
  >([]);
  const [showBRoll, setShowBRoll] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineCaptions, setTimelineCaptions] = useState<
    Array<{ start: number; end: number; text: string }>
  >([]);

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

      // Pre-fill from aiScript if available
      const aiRaw = sessionStorage.getItem("studio-ai-script");
      if (aiRaw) {
        const ai = JSON.parse(aiRaw) as { hook?: string; caption?: string; hashtags?: string[] };
        if (ai.hook) setHook(ai.hook);
        if (ai.caption) setCaption(ai.caption);
        if (ai.hashtags?.length) setHashtags(ai.hashtags.join(", "));
        sessionStorage.removeItem("studio-ai-script");
      }
    } catch {
      window.location.href = "/clips";
    }
  }, []);

  // Load transcript on-demand when Studio opens
  useEffect(() => {
    if (!clip || !sourcePath) return;

    // If clip already has words from generate, use them
    if (clip.words && clip.words.length > 0) {
      setTranscriptWords(clip.words);
      setTranscriptStatus("ready");
      return;
    }

    const duration = clip.endTime - clip.startTime;
    setTranscriptStatus("loading");

    const params = new URLSearchParams({
      sourcePath,
      startTime: String(clip.startTime),
      duration: String(duration),
    });

    fetch(`/api/studio/transcript?${params}`)
      .then((r) => r.json())
      .then((data: { success: boolean; words?: Array<{ word: string; start: number; end: number }> }) => {
        if (data.success && data.words && data.words.length > 0) {
          setTranscriptWords(data.words);
          setTranscriptStatus("ready");
        } else {
          setTranscriptStatus("failed");
        }
      })
      .catch(() => {
        setTranscriptStatus("failed");
      });
  }, [clip, sourcePath]);

  useEffect(() => {
    if (transcriptWords.length === 0) return;
    const transcript = transcriptWords.map((w) => w.word).join(" ");
    const params = new URLSearchParams({
      transcript: transcript.slice(0, 200),
      language: "auto",
    });
    fetch(`/api/patterns/suggest?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.hooks) {
          setPatternSuggestions(data.hooks);
        }
      })
      .catch(() => {});
  }, [transcriptWords]);

  useEffect(() => {
    const result = analyzeHookStrength(hook);
    setHookAnalysis(result);
  }, [hook]);

  async function rewriteHook() {
    if (!clip || !hook.trim()) return;

    setIsRewriting(true);
    setRewriteAlternatives([]);

    try {
      const transcript = transcriptWords.length > 0
        ? transcriptWords.map((w) => w.word).join(" ")
        : "";

      const response = await fetch("/api/hooks/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalHook: hook,
          transcript: transcript.slice(0, 300),
          platform: clip.platform || "reels",
          language: "auto",
          hookType: selectedHookType,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        hooks?: Array<{ type: string; text: string; score: number }>;
        error?: string;
        detail?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.error || "Rewrite failed");
      }

      setRewriteAlternatives(data.hooks || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Rewrite failed", "error");
    } finally {
      setIsRewriting(false);
    }
  }

  async function generateCTA() {
    if (!clip) return;

    setIsGeneratingCTA(true);

    try {
      const transcript = transcriptWords.length > 0
        ? transcriptWords.map((w) => w.word).join(" ")
        : "";

      const response = await fetch("/api/cta/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.slice(0, 300),
          platform: clip.platform || "reels",
          language: "auto",
          tone: selectedTone !== "auto" ? selectedTone : undefined,
          ctaType: selectedCTAType !== "auto" ? selectedCTAType : undefined,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        cta?: string;
        error?: string;
        detail?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.error || "CTA generation failed");
      }

      if (data.cta) {
        setCta(data.cta);
        showToast("CTA generated!", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "CTA generation failed", "error");
    } finally {
      setIsGeneratingCTA(false);
    }
  }

  async function generateCuriosity() {
    if (!clip) return;
    setIsGeneratingCuriosity(true);
    try {
      const transcript = transcriptWords.length > 0
        ? transcriptWords.map((w) => w.word).join(" ")
        : hook || caption || clip.title;
      const response = await fetch("/api/curiosity/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.slice(0, 500), language: "auto", tone: selectedTone !== "auto" ? selectedTone : undefined }),
      });
      const data = await response.json() as {
        success: boolean;
        openLoop?: string;
        delayedPayoff?: string;
        mysteryPhrase?: string;
        tensionLine?: string;
      };
      if (data.success) {
        setCuriosityHooks({
          openLoop: data.openLoop || "",
          delayedPayoff: data.delayedPayoff || "",
          mysteryPhrase: data.mysteryPhrase || "",
          tensionLine: data.tensionLine || "",
        });
      }
    } catch {
      showToast("Curiosity generation failed", "error");
    } finally {
      setIsGeneratingCuriosity(false);
    }
  }

  async function fetchBRollSuggestions() {
    if (transcriptWords.length === 0) return;
    try {
      const segments = transcriptWords.map((w) => ({ text: w.word, start: w.start, end: w.end }));
      const response = await fetch("/api/broll/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptWords.map((w) => w.word).join(" "), segments }),
      });
      const data = await response.json() as {
        success: boolean;
        suggestions?: Array<{ timestamp: number; keyword: string; suggestion: string; searchQuery: string; type: string }>;
      };
      if (data.success && data.suggestions) {
        setBrollSuggestions(data.suggestions);
      }
    } catch {
      showToast("B-Roll fetch failed", "error");
    }
  }

  function handleBrandPresetLoad(preset: BrandPreset) {
    setStyleParams({
      fontColor: preset.fontColor as typeof styleParams.fontColor,
      fontSize: preset.fontSize,
      background: preset.background as typeof styleParams.background,
      position: preset.captionPosition as typeof styleParams.position,
      hookPosition: preset.hookPosition as typeof styleParams.position,
    });
    setCaptionEffect(preset.captionEffect);
    setSelectedTone(preset.defaultTone);
    setBlurBackground(preset.blurBackground);
    showToast(`Loaded "${preset.name}"`, "success");
  }

  function containsEmoji(text: string): boolean {
  return /[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);
}

function scoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-cyan-400 text-black shadow-[0_0_8px_rgba(34,211,238,0.5)]";
  if (score >= 60) return "bg-emerald-500 text-black";
  if (score >= 40) return "bg-yellow-500 text-black";
  return "bg-zinc-600 text-zinc-300";
}

function isInsightWarning(text: string): boolean {
  return /^warn|^⚠|low |weak |poor |slow /i.test(text);
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
          tone: selectedTone !== "auto" ? selectedTone : undefined,
          words: transcriptWords.length > 0 ? transcriptWords : undefined,
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
          words: transcriptWords.length > 0 ? transcriptWords : undefined,
          musicPath: musicEnabled ? (selectedMusicFile ?? undefined) : undefined,
          musicVolume: musicEnabled ? musicVolume : undefined,
          captionEffect,
          blurBackground,
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
      showToast("Render selesai!", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Render failed.";
      setError(msg);
      showToast(msg, "error");
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

  function applyPreset(preset: VisualPreset) {
    setSelectedPreset(preset.id);
    setStyleParams({
      fontColor: preset.fontColor,
      fontSize: preset.fontSize,
      background: preset.background,
      position: preset.position,
      hookPosition: preset.hookPosition,
    });
    setCaptionEffect(preset.captionEffect);
    setBlurBackground(preset.blurBackground);
    showToast(`Preset "${preset.label}" applied`, "success");
  }

  if (!clip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="size-6 animate-spin text-cyan-400" />
      </div>
    );
  }

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
                    transcriptStatus === "loading"
                      ? "bg-amber-500/10 text-amber-400"
                      : transcriptStatus === "ready"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : transcriptStatus === "failed"
                          ? "bg-zinc-800 text-zinc-400"
                          : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {transcriptStatus === "loading"
                    ? "Mentranskrip audio..."
                    : transcriptStatus === "ready"
                      ? "Transcript tersedia"
                      : transcriptStatus === "failed"
                        ? "AI caption mode"
                        : "No transcript"}
                </span>
              </div>
              <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${scoreBadgeClass(clip.score)}`}>
                {clip.score}
              </span>
            </div>

            {/* Retention Insights */}
            {clip.insights && clip.insights.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {clip.insights.slice(0, 3).map((insight, i) => (
                  <span
                    key={i}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      isInsightWarning(insight)
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {isInsightWarning(insight) ? insight : `✓ ${insight}`}
                  </span>
                ))}
                {clip.insights.length > 3 ? (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                    +{clip.insights.length - 3} more
                  </span>
                ) : null}
              </div>
            ) : null}

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

            {/* B-Roll Ideas */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowBRoll(!showBRoll);
                  if (!showBRoll && brollSuggestions.length === 0) void fetchBRollSuggestions();
                }}
                className="flex h-7 items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 text-[10px] text-zinc-400 hover:border-cyan-400/30 hover:text-cyan-400"
              >
                <Lightbulb className="size-3" />
                B-Roll Ideas
                {brollSuggestions.length > 0 && (
                  <span className="ml-1 rounded bg-zinc-800 px-1 text-[9px]">{brollSuggestions.length}</span>
                )}
              </button>
              {showBRoll && brollSuggestions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {brollSuggestions.slice(0, 6).map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5"
                    >
                      <div className="flex-1">
                        <span className="text-[10px] text-zinc-500">{Math.round(s.timestamp)}s</span>
                        <span className="ml-2 text-[11px] text-zinc-300">{s.suggestion}</span>
                      </div>
                      <a
                        href={`https://www.pexels.com/search/${encodeURIComponent(s.searchQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-[10px] text-cyan-400 hover:underline"
                      >
                        Search
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline Editor */}
            {transcriptWords.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!showTimeline && timelineCaptions.length === 0) {
                      const segs: Array<{ start: number; end: number; text: string }> = [];
                      let current = { start: 0, end: 0, text: "" };
                      for (const w of transcriptWords) {
                        if (current.text === "") {
                          current = { start: w.start, end: w.end, text: w.word };
                        } else if (w.start - current.end < 0.5) {
                          current.end = w.end;
                          current.text += " " + w.word;
                        } else {
                          segs.push(current);
                          current = { start: w.start, end: w.end, text: w.word };
                        }
                        if (current.text.split(" ").length >= 6) {
                          segs.push(current);
                          current = { start: 0, end: 0, text: "" };
                        }
                      }
                      if (current.text) segs.push(current);
                      setTimelineCaptions(segs);
                    }
                    setShowTimeline(!showTimeline);
                  }}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 text-[10px] text-zinc-400 hover:border-cyan-400/30 hover:text-cyan-400"
                >
                  Edit Caption Timing
                </button>
                {showTimeline && timelineCaptions.length > 0 && (
                  <div className="mt-3">
                    <TimelineEditor
                      duration={clip.endTime - clip.startTime}
                      captions={timelineCaptions}
                      onCaptionsChange={setTimelineCaptions}
                    />
                  </div>
                )}
              </div>
            )}
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

            {/* Tone Selector */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500">
                Tone
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setSelectedTone("auto")}
                  className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
                    selectedTone === "auto"
                      ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  Auto
                </button>
                {TONE_PRESETS.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setSelectedTone(tone.id)}
                    className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
                      selectedTone === tone.id
                        ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
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
              <label className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase text-zinc-500">
                Hook
                <span className={hook.length > 70 ? "text-amber-400" : "text-zinc-600"}>
                  {hook.length}/80
                </span>
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

              {/* Viral Pattern Suggestions */}
              {patternSuggestions.length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-zinc-500">
                    💡 Viral hooks serupa:
                  </p>
                  {patternSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setHook(s.text);
                        showToast("Hook copied!", "success");
                      }}
                      className="flex w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-left text-[11px] text-zinc-300 transition hover:border-cyan-400/30 hover:bg-zinc-900"
                    >
                      <span className="flex-1 truncate">{s.text}</span>
                      <span className="shrink-0 text-[10px] text-cyan-400/60">
                        {s.virality}/10
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Hook Strength Meter */}
              {hook.trim() && hookAnalysis ? (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">
                      Hook strength
                      {hookAnalysis.type !== "generic" ? (
                        <span className="ml-1 text-cyan-400/70">
                          ({hookAnalysis.type})
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        hookAnalysis.score >= 70
                          ? "text-emerald-400"
                          : hookAnalysis.score >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {hookAnalysis.score}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        hookAnalysis.score >= 70
                          ? "bg-emerald-400"
                          : hookAnalysis.score >= 40
                            ? "bg-yellow-400"
                            : "bg-red-400"
                      }`}
                      style={{ width: `${hookAnalysis.score}%` }}
                    />
                  </div>
                  {hookAnalysis.suggestions.length > 0 ? (
                    <p className="text-[10px] text-zinc-500">
                      {hookAnalysis.suggestions[0]}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Hook Type Selector + Rewrite */}
              <div className="mt-2 flex items-center gap-1.5">
                <select
                  value={selectedHookType}
                  onChange={(e) =>
                    setSelectedHookType(e.target.value as HookType | "best")
                  }
                  className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[10px] text-zinc-400 outline-none transition focus:border-cyan-400/50"
                >
                  <option value="best">Auto</option>
                  <option value="contrarian">Contrarian</option>
                  <option value="shock">Shock</option>
                  <option value="curiosity">Curiosity</option>
                  <option value="story">Story</option>
                  <option value="fear">Fear</option>
                  <option value="urgency">Urgency</option>
                </select>
                <button
                  type="button"
                  disabled={isRewriting || !hook.trim()}
                  onClick={() => void rewriteHook()}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-cyan-400/30 bg-cyan-400/5 px-2.5 text-[10px] font-medium text-cyan-400 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isRewriting ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Wand2 className="size-3" />
                  )}
                  Rewrite
                </button>
              </div>

              {/* Rewrite Alternatives */}
              {rewriteAlternatives.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {rewriteAlternatives.map((alt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setHook(alt.text);
                        setRewriteAlternatives([]);
                      }}
                      className="flex w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-left text-[11px] text-zinc-300 transition hover:border-cyan-400/30 hover:bg-zinc-900"
                    >
                      <Sparkles className="size-3 shrink-0 text-cyan-400/60" />
                      <span className="flex-1 truncate">{alt.text}</span>
                      <span
                        className={`shrink-0 text-[10px] font-bold ${
                          alt.score >= 70
                            ? "text-emerald-400"
                            : alt.score >= 40
                              ? "text-yellow-400"
                              : "text-zinc-500"
                        }`}
                      >
                        {alt.score}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Curiosity Boost */}
              <div className="mt-2">
                <button
                  type="button"
                  disabled={isGeneratingCuriosity}
                  onClick={() => void generateCuriosity()}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/5 px-2.5 text-[10px] font-medium text-amber-400 transition hover:bg-amber-400/10 disabled:opacity-40"
                >
                  {isGeneratingCuriosity ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Sparkles className="size-3" />
                  )}
                  Curiosity Boost
                </button>
                {curiosityHooks && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(curiosityHooks).map(([key, text]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setHook(text)}
                        className="flex w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-left text-[11px] text-zinc-300 transition hover:border-amber-400/30 hover:bg-zinc-900"
                      >
                        <span className="shrink-0 text-[9px] uppercase text-amber-400/60">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="flex-1 truncate">{text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase text-zinc-500">
                Caption
                <span className={caption.length > 250 ? "text-amber-400" : "text-zinc-600"}>
                  {caption.length}/300
                </span>
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

            {/* CTA (Call to Action) */}
            <div>
              <label className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase text-zinc-500">
                CTA (Call to Action)
                <span className={cta.length > 90 ? "text-amber-400" : "text-zinc-600"}>
                  {cta.length}/100
                </span>
              </label>
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                maxLength={100}
                placeholder="Add a call to action..."
                className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none transition focus:border-cyan-400/50"
              />
              <div className="mt-1.5 flex items-center gap-1.5">
                <select
                  value={selectedCTAType}
                  onChange={(e) => setSelectedCTAType(e.target.value)}
                  className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[10px] text-zinc-400 outline-none transition focus:border-cyan-400/50"
                >
                  <option value="auto">Auto</option>
                  {CTA_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isGeneratingCTA}
                  onClick={() => void generateCTA()}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-cyan-400/30 bg-cyan-400/5 px-2.5 text-[10px] font-medium text-cyan-400 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isGeneratingCTA ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Sparkles className="size-3" />
                  )}
                  Generate CTA
                </button>
                {cta ? (
                  <button
                    type="button"
                    onClick={() => {
                      const suffix = caption ? `\n\n${cta}` : cta;
                      setCaption((prev) => (prev + suffix).slice(0, 300));
                      showToast("CTA added to caption!", "success");
                    }}
                    className="flex h-7 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 text-[10px] font-medium text-emerald-400 transition hover:bg-emerald-500/10"
                  >
                    Add to Caption
                  </button>
                ) : null}
              </div>
            </div>

            {/* Quick Style Presets */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500">
                Quick Style
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {VISUAL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
                      selectedPreset === preset.id
                        ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedPreset("custom")}
                  className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
                    selectedPreset === "custom"
                      ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* === Compact Style Controls === */}
            <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              <div className="space-y-3 p-3">
                {/* Color */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500" title="Warna teks caption di video">
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
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500" title="Ukuran font caption">
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
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500" title="Latar belakang teks">
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
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500" title="Posisi caption di frame">
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
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500" title="Posisi hook text di frame">
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
                  <p className="mb-1.5 text-[11px] font-medium uppercase text-zinc-500" title="Animasi kemunculan teks">
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

                {/* Blur Background Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setBlurBackground(!blurBackground);
                      setSelectedPreset("custom");
                    }}
                    className={`flex h-8 w-full items-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition ${
                      blurBackground
                        ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700"
                    }`}
                  >
                    Blur BG
                    <span className="ml-auto text-[10px] text-zinc-500">
                      {blurBackground ? "ON" : "OFF"}
                    </span>
                  </button>
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

            {/* Brand Presets */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <BrandPresetManager
                currentSettings={{
                  fontColor: styleParams.fontColor,
                  fontSize: styleParams.fontSize,
                  background: styleParams.background,
                  captionEffect,
                  hookPosition: styleParams.hookPosition || "bottom",
                  captionPosition: styleParams.position,
                  blurBackground,
                }}
                currentTone={selectedTone}
                currentLanguage="auto"
                onLoad={handleBrandPresetLoad}
              />
            </div>

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
            {!isRendering ? (
              <p className="text-center text-[10px] text-zinc-600">
                Estimasi render ~15-25 detik
              </p>
            ) : null}

          </motion.div>
        </div>
      </div>
    </section>
  );
}
