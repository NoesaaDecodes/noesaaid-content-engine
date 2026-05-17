"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Lightbulb,
  Loader2,
  Play,
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

const fontColorOptions: Array<{
  value: CaptionFontColor;
  label: string;
  dot: string;
}> = [
  { value: "#FFE600", label: "Yellow", dot: "#FFE600" },
  { value: "#FFFFFF", label: "White", dot: "#FFFFFF" },
  { value: "#00FFFF", label: "Cyan", dot: "#00FFFF" },
];

const fontSizeOptions: Array<{ value: CaptionFontSize; label: string }> = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const backgroundOptions: Array<{
  value: CaptionBackground;
  label: string;
}> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "none", label: "None" },
];

const positionOptions: Array<{ value: CaptionPosition; label: string }> = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
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
  const [videoUrl, setVideoUrl] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderStep, setRenderStep] = useState("");
  const [error, setError] = useState("");
  const [aiSuccess, setAiSuccess] = useState(false);
  const [selectedMusicFile, setSelectedMusicFile] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(30);

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
      setVideoUrl(parsed.previewUrl || parsed.downloadUrl || "");
    } catch {
      window.location.href = "/clips";
    }
  }, []);

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
          musicPath: selectedMusicFile ?? undefined,
          musicVolume: selectedMusicFile ? musicVolume : undefined,
        }),
      });

      const data = (await response.json()) as StudioRenderResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success ? data.detail || data.error : "Render failed"
        );
      }

      setVideoUrl(data.output.downloadUrl);
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
        <div className="grid gap-6 lg:grid-cols-[45%_1fr]">
          {/* Video Preview */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
          >
            {videoUrl ? (
              <video
                src={videoUrl}
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
            <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
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
          </motion.div>

          {/* Right Panel — Script Editor */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-semibold text-white">
                {clip.title}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Edit your clip script and regenerate with custom caption styling
              </p>
            </div>

            {/* 1. AI Generate Button — TOP */}
            <button
              type="button"
              disabled={isGeneratingAI}
              onClick={() => void generateWithAI()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/5 text-sm font-medium text-cyan-400 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Lightbulb className="size-4" />
                  Butuh ide konten? Generate dengan AI
                </>
              )}
            </button>

            {/* AI Success Banner */}
            {aiSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400"
              >
                Ide dari AI sudah diisi. Edit sesuai kebutuhanmu.
              </motion.div>
            ) : null}

            {/* 2. Hook + char counter */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Hook
              </label>
              <input
                ref={hookRef}
                type="text"
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                maxLength={80}
                placeholder="Attention-grabbing opening line..."
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-cyan-400/50"
              />
              <p className="mt-1 text-right text-[11px] text-zinc-600">
                {hook.length}/80
              </p>
            </div>

            {/* 3. Emoji picker below hook */}
            <EmojiPicker
              onSelect={(char) =>
                insertAtCursor(hookRef, char, setHook, hook)
              }
            />

            {/* 4. Caption + char counter */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Caption
              </label>
              <textarea
                ref={captionRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={300}
                placeholder="Write a compelling caption..."
                rows={4}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
              />
              <p className="mt-1 text-right text-[11px] text-zinc-600">
                {caption.length}/300
              </p>
            </div>

            {/* 5. Emoji picker below caption */}
            <EmojiPicker
              onSelect={(char) =>
                insertAtCursor(captionRef, char, setCaption, caption)
              }
            />

            {/* 6. Hashtags */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Hashtags
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#football, #futsal, #jersey"
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none transition focus:border-cyan-400/50"
              />
              <p className="mt-1 text-[11px] text-zinc-600">
                Comma-separated
              </p>
            </div>
          </motion.div>
        </div>

        {/* 7. Style Controls */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Caption Style
          </p>

          <div className="space-y-4">
            {/* Color Row */}
            <div>
              <p className="mb-2 text-[11px] font-medium text-zinc-500">
                Color
              </p>
              <div className="flex gap-2">
                {fontColorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateStyle("fontColor", opt.value)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition ${
                      styleParams.fontColor === opt.value
                        ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: opt.dot }}
                    />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Row */}
            <div>
              <p className="mb-2 text-[11px] font-medium text-zinc-500">
                Size
              </p>
              <div className="flex gap-2">
                {fontSizeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateStyle("fontSize", opt.value)}
                    className={`rounded-lg border px-4 py-2 text-xs font-medium transition ${
                      styleParams.fontSize === opt.value
                        ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Row */}
            <div>
              <p className="mb-2 text-[11px] font-medium text-zinc-500">
                Background
              </p>
              <div className="flex gap-2">
                {backgroundOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateStyle("background", opt.value)}
                    className={`rounded-lg border px-4 py-2 text-xs font-medium transition ${
                      styleParams.background === opt.value
                        ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Position Row */}
            <div>
              <p className="mb-2 text-[11px] font-medium text-zinc-500">
                Position
              </p>
              <div className="flex gap-2">
                {positionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateStyle("position", opt.value)}
                    className={`rounded-lg border px-4 py-2 text-xs font-medium transition ${
                      styleParams.position === opt.value
                        ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hook Position Row */}
            <div>
              <p className="mb-2 text-[11px] font-medium text-zinc-500">
                Posisi Hook
              </p>
              <div className="flex gap-2">
                {positionOptions.map((opt) => (
                  <button
                    key={`hook-${opt.value}`}
                    type="button"
                    onClick={() => updateStyle("hookPosition", opt.value)}
                    className={`rounded-lg border px-4 py-2 text-xs font-medium transition ${
                      (styleParams.hookPosition || "top") === opt.value
                        ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Music Picker */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-8"
        >
          <MusicPicker
            selectedFilename={selectedMusicFile}
            volume={musicVolume}
            onSelect={setSelectedMusicFile}
            onVolumeChange={setMusicVolume}
          />
        </motion.div>

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

        {/* 8. Generate Final Clip — BOTTOM */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-8"
        >
          <button
            type="button"
            disabled={isRendering}
            onClick={() => void generateFinalClip()}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-cyan-400 text-lg font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {isRendering ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                {renderStep || "Rendering..."}
              </>
            ) : (
              <>
                <Play className="size-5" />
                Generate Final Clip
              </>
            )}
          </button>
        </motion.div>

        {/* Download */}
        {videoUrl && !isRendering ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex justify-center"
          >
            <a
              href={videoUrl}
              download
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-3 text-sm font-medium text-black transition hover:bg-cyan-300"
            >
              <Download className="size-4" />
              Download Clip
            </a>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
