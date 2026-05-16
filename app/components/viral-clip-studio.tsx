"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  FileVideo,
  Loader2,
  Scissors,
  Subtitles,
  TrendingUp,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { defaultTemplateId } from "@/app/lib/templates";

const settingsKey = "noesaaid_settings";
const historyKey = "noesaaid_history";

type AppSettings = {
  quality: string;
  maxClips: number;
  targetDuration: number;
};

function readSettings(): AppSettings {
  if (typeof window === "undefined")
    return { quality: "standard", maxClips: 3, targetDuration: 30 };
  try {
    const raw = localStorage.getItem(settingsKey);
    if (!raw) return { quality: "standard", maxClips: 3, targetDuration: 30 };
    const parsed = JSON.parse(raw);
    return {
      quality: parsed.quality || "standard",
      maxClips: parsed.maxClips || 3,
      targetDuration: parsed.targetDuration || 30,
    };
  } catch {
    return { quality: "standard", maxClips: 3, targetDuration: 30 };
  }
}

function saveToHistory(entry: {
  sourcePath: string;
  sourceFilename: string;
  clips: ViralClip[];
}) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(historyKey);
    const existing: unknown[] = raw ? JSON.parse(raw) : [];
    const newEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}`,
      ...entry,
      generatedAt: new Date().toISOString(),
    };
    const next = [newEntry, ...existing].slice(0, 10);
    localStorage.setItem(historyKey, JSON.stringify(next));
  } catch {
    // localStorage may be full or unavailable
  }
}

type UploadedVideo = {
  sourcePath: string;
  filename: string;
  originalName: string;
  duration: number | null;
  size: number;
  previewUrl: string;
};

type UploadFailure = {
  filename: string;
  error: string;
};

type UploadResponse =
  | {
      success: true;
      uploads: Array<Omit<UploadedVideo, "previewUrl">>;
      errors: UploadFailure[];
    }
  | {
      success: false;
      error?: string;
      detail?: string;
      uploads?: Array<Omit<UploadedVideo, "previewUrl">>;
      errors?: UploadFailure[];
    };

type ViralClip = {
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
  error?: string;
};

type GenerateResponse =
  | {
      success: true;
      clips: ViralClip[];
    }
  | {
      success: false;
      error?: string;
      detail?: string;
    };

const featurePills = [
  { icon: Wand2, label: "AI Hook" },
  { icon: Subtitles, label: "Auto Caption" },
  { icon: FileVideo, label: "Vertical Crop" },
  { icon: TrendingUp, label: "Viral Score" },
];

export function ViralClipStudio({
  standalone = false,
  onOpenScriptStudio,
}: {
  standalone?: boolean;
  onOpenScriptStudio?: () => void;
}) {
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [activeSourcePath, setActiveSourcePath] = useState("");
  const [clips, setClips] = useState<ViralClip[]>([]);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStep, setGenerateStep] = useState("");
  const [copiedClipKey, setCopiedClipKey] = useState("");
  const [expandedCaption, setExpandedCaption] = useState<number | null>(null);
  const [settings] = useState<AppSettings>(readSettings);
  const [platform, setPlatform] = useState<string>("reels");
  const [customWidth, setCustomWidth] = useState<number>(1080);
  const [customHeight, setCustomHeight] = useState<number>(1920);
  const [language, setLanguage] = useState<"auto" | "id" | "en">("auto");

  const activeVideo =
    uploadedVideos.find((v) => v.sourcePath === activeSourcePath) || null;
  const hasResults = clips.length > 0;
  const hasUploads = uploadedVideos.length > 0;

  async function uploadFiles(files: FileList | File[]) {
    const selected = Array.from(files).slice(0, 5);
    if (selected.length === 0) return;

    const oversized = selected.find((f) => f.size > 250 * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.name} exceeds 250MB limit.`);
      return;
    }

    setIsUploading(true);
    setError("");
    setClips([]);

    const formData = new FormData();
    selected.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/clips/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as UploadResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success ? data.detail || data.error : "Upload failed"
        );
      }

      const usedIndexes = new Set<number>();
      const newUploads = (data.uploads || []).map((upload) => {
        const idx = selected.findIndex(
          (f, i) =>
            !usedIndexes.has(i) &&
            f.name === upload.originalName &&
            f.size === upload.size
        );
        const matched = selected[idx] || selected[0];
        if (idx >= 0) usedIndexes.add(idx);
        return { ...upload, previewUrl: URL.createObjectURL(matched) };
      });

      setUploadedVideos((prev) => [...newUploads, ...prev]);
      setActiveSourcePath(newUploads[0]?.sourcePath || activeSourcePath);

      if (data.errors?.length) {
        setError(
          data.errors.map((e) => `${e.filename}: ${e.error}`).join("; ")
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function generate() {
    if (!activeVideo) return;

    setIsGenerating(true);
    setGenerateStep("Starting transcription...");
    setError("");
    setClips([]);

    const stepTimer1 = window.setTimeout(
      () => setGenerateStep("Analyzing source video"),
      800
    );
    const stepTimer2 = window.setTimeout(
      () => setGenerateStep("Selecting viral moments"),
      1600
    );
    const stepTimer3 = window.setTimeout(
      () => setGenerateStep("Rendering clips"),
      2400
    );

    try {
      const response = await fetch("/api/clips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath: activeVideo.sourcePath,
          platform,
          maxClips: settings.maxClips,
          targetDuration: settings.targetDuration,
          templateId: defaultTemplateId,
          customWidth: platform === "custom" ? customWidth : undefined,
          customHeight: platform === "custom" ? customHeight : undefined,
          language,
          settings: { quality: settings.quality },
        }),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success ? data.detail || data.error : "Generation failed"
        );
      }

      setClips(data.clips);
      setGenerateStep("");

      // Save to history
      saveToHistory({
        sourcePath: activeVideo.sourcePath,
        sourceFilename: activeVideo.originalName,
        clips: data.clips,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setGenerateStep("");
    } finally {
      window.clearTimeout(stepTimer1);
      window.clearTimeout(stepTimer2);
      window.clearTimeout(stepTimer3);
      setIsGenerating(false);
    }
  }

  function startOver() {
    uploadedVideos.forEach((v) => URL.revokeObjectURL(v.previewUrl));
    setUploadedVideos([]);
    setActiveSourcePath("");
    setClips([]);
    setError("");
    setGenerateStep("");
    setCopiedClipKey("");
    setExpandedCaption(null);
  }

  function removeVideo(sourcePath: string) {
    const video = uploadedVideos.find((v) => v.sourcePath === sourcePath);
    if (video) URL.revokeObjectURL(video.previewUrl);

    const remaining = uploadedVideos.filter((v) => v.sourcePath !== sourcePath);
    setUploadedVideos(remaining);

    if (activeSourcePath === sourcePath) {
      setActiveSourcePath(remaining[0]?.sourcePath || "");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void uploadFiles(event.target.files);
      event.target.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files) {
      void uploadFiles(event.dataTransfer.files);
    }
  }

  async function copyCaption(clip: ViralClip, index: number) {
    const text = `${clip.caption}\n\n${clip.hashtags.join(" ")}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
    setCopiedClipKey(`${clip.startTime}-${index}`);
    window.setTimeout(() => setCopiedClipKey(""), 2000);
  }

  return (
    <section
      className={
        standalone
          ? "min-h-screen bg-[#0a0a0a] text-zinc-100"
          : "text-zinc-100"
      }
    >
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        {standalone ? (
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        ) : null}

        {/* Hero */}
        {!hasResults ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 text-center"
          >
            <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
              NoesaaID
            </p>
            <h1 className="mt-2 text-[36px] font-semibold tracking-tight text-white">
              Turn any video into viral-ready clips
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Upload once. Generate in seconds.
            </p>
          </motion.div>
        ) : null}

        {/* Upload Zone */}
        {!hasResults && !isGenerating ? (
          <div className="mx-auto max-w-[640px] space-y-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 text-center transition ${
                isDragging
                  ? "border-cyan-400 bg-cyan-400/[0.06] shadow-[0_0_30px_rgba(34,211,238,0.08)]"
                  : "border-zinc-800/80 hover:border-zinc-700 bg-zinc-950"
              }`}
            >
              <input
                type="file"
                accept=".mp4,.mov,.mkv,.webm,video/mp4,video/webm,video/quicktime"
                multiple
                className="sr-only"
                onChange={handleFileChange}
              />
              <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500">
                {isUploading ? (
                  <Loader2 className="size-5 animate-spin text-cyan-400" />
                ) : (
                  <Upload className="size-5" />
                )}
              </div>
              <p className="text-sm font-medium text-zinc-300">
                {isUploading
                  ? "Uploading..."
                  : "Drop videos here or browse"}
              </p>
              <p className="mt-1.5 text-xs text-zinc-600">
                MP4, MOV, MKV, WEBM up to 250MB
              </p>
            </label>

            {/* Feature pills */}
            {!hasUploads ? (
              <div className="flex flex-wrap justify-center gap-2">
                {featurePills.map((pill) => {
                  const Icon = pill.icon;
                  return (
                    <span
                      key={pill.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-500"
                    >
                      <Icon className="size-3 text-zinc-600" />
                      {pill.label}
                    </span>
                  );
                })}
              </div>
            ) : null}

            {/* Upload previews */}
            <AnimatePresence>
              {uploadedVideos.map((video) => (
                <motion.div
                  key={video.sourcePath}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                    video.sourcePath === activeSourcePath
                      ? "border-cyan-400/30 bg-cyan-400/[0.04]"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                    <FileVideo className="size-4 text-zinc-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {video.originalName}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {formatDuration(video.duration)}
                      {" · "}
                      {formatBytes(video.size)}
                    </p>
                  </div>
                  {video.sourcePath === activeSourcePath ? (
                    <span className="shrink-0 rounded-md bg-cyan-400 px-2 py-0.5 text-[11px] font-semibold text-black">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveSourcePath(video.sourcePath)}
                      className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
                    >
                      Select
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeVideo(video.sourcePath)}
                    className="shrink-0 rounded-md p-1 text-zinc-600 transition hover:text-red-400"
                    aria-label={`Remove ${video.originalName}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Platform Selector */}
            {hasUploads ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "reels", label: "Reels", dims: "1080×1920" },
                    { id: "tiktok", label: "TikTok", dims: "1080×1920" },
                    { id: "youtube", label: "YouTube", dims: "1920×1080" },
                    { id: "square", label: "Square", dims: "1080×1080" },
                    { id: "custom", label: "Custom", dims: "Set size" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatform(p.id)}
                      className={`flex flex-col items-center rounded-lg border px-4 py-2 text-xs transition ${
                        platform === p.id
                          ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-400"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <span className="font-medium">{p.label}</span>
                      <span className="mt-0.5 text-[10px] text-zinc-500">
                        {p.dims}
                      </span>
                    </button>
                  ))}
                </div>

                {platform === "custom" ? (
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <label className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">W</span>
                      <input
                        type="number"
                        min={256}
                        max={3840}
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                        className="h-8 w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-white outline-none focus:border-cyan-400/50"
                      />
                    </label>
                    <span className="text-xs text-zinc-600">×</span>
                    <label className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">H</span>
                      <input
                        type="number"
                        min={256}
                        max={3840}
                        value={customHeight}
                        onChange={(e) =>
                          setCustomHeight(Number(e.target.value))
                        }
                        className="h-8 w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-white outline-none focus:border-cyan-400/50"
                      />
                    </label>
                    <span className="text-[10px] text-zinc-600">px</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Captions</span>
              <div className="flex gap-1">
                {(
                  [
                    { id: "auto", label: "Auto" },
                    { id: "id", label: "ID" },
                    { id: "en", label: "EN" },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLanguage(l.id)}
                    className={`rounded-md border px-3 py-1 text-xs transition ${
                      language === l.id
                        ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            {hasUploads ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <button
                  type="button"
                  disabled={isGenerating || isUploading || !activeVideo}
                  onClick={generate}
                  className="mt-1 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-white text-[18px] font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      {generateStep || "Generating..."}
                    </>
                  ) : (
                    <>
                      <Scissors className="size-5" />
                      Generate Viral Clips
                    </>
                  )}
                </button>
              </motion.div>
            ) : null}
          </div>
        ) : null}

        {/* Generating state */}
        {isGenerating && !hasResults ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 flex flex-col items-center gap-4 py-16"
          >
            <Loader2 className="size-8 animate-spin text-cyan-400" />
            <p className="text-lg font-medium text-zinc-300">
              {generateStep || "Processing..."}
            </p>
            <p className="text-sm text-zinc-600">This may take a moment</p>
          </motion.div>
        ) : null}

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

        {/* Results Gallery */}
        {hasResults ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8 text-center">
              <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
                NoesaaID
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {clips.length} viral clip{clips.length !== 1 ? "s" : ""} ready
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {clips.map((clip, index) => (
                <motion.article
                  key={`${clip.title}-${clip.startTime}-${index}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition duration-200 hover:-translate-y-0.5 hover:border-zinc-700"
                >
                  {clip.previewUrl ? (
                    <video
                      src={clip.previewUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="aspect-[9/16] w-full bg-black object-contain"
                    />
                  ) : (
                    <div className="flex aspect-[9/16] items-center justify-center bg-black">
                      <FileVideo className="size-10 text-zinc-800" />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 uppercase">
                            {platform === "custom"
                              ? `${customWidth}×${customHeight}`
                              : platform}
                          </span>
                          <p className="text-xs text-zinc-500">
                            {clip.startTime}s &ndash; {clip.endTime}s
                          </p>
                        </div>
                        <h3 className="mt-1 text-sm font-semibold text-white">
                          {clip.title}
                        </h3>
                      </div>
                      <span className="shrink-0 rounded-lg bg-cyan-400 px-2.5 py-1 text-sm font-bold text-black">
                        {clip.score}
                      </span>
                    </div>

                    <p className="mb-3 text-sm leading-relaxed text-zinc-400">
                      {clip.hook}
                    </p>

                    {/* Caption */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCaption(
                          expandedCaption === index ? null : index
                        )
                      }
                      className="mb-3 w-full text-left"
                    >
                      <p
                        className={`text-xs leading-relaxed text-zinc-500 ${
                          expandedCaption === index ? "" : "line-clamp-2"
                        }`}
                      >
                        {clip.caption}
                      </p>
                      {clip.caption.length > 100 ? (
                        <span className="mt-1 inline-block text-xs text-zinc-600 underline">
                          {expandedCaption === index
                            ? "Show less"
                            : "Show more"}
                        </span>
                      ) : null}
                    </button>

                    {/* Hashtags */}
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {clip.hashtags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-500"
                        >
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {clip.downloadUrl ? (
                        <a
                          href={clip.downloadUrl}
                          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-400 text-sm font-medium text-black transition hover:bg-cyan-300"
                        >
                          <Download className="size-3.5" />
                          Download
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void copyCaption(clip, index)}
                        className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-800 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                      >
                        {copiedClipKey ===
                        `${clip.startTime}-${index}` ? (
                          <>
                            <Check className="size-3.5 text-cyan-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Clipboard className="size-3.5" />
                            Copy Caption
                          </>
                        )}
                      </button>
                    </div>

                    {clip.error ? (
                      <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                        {clip.error}
                      </p>
                    ) : null}
                  </div>
                </motion.article>
              ))}
            </div>

            {/* Global Actions */}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={generate}
                disabled={isGenerating || !activeVideo}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Scissors className="size-4" />
                )}
                Generate Again
              </button>
              <button
                type="button"
                onClick={startOver}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-800 px-6 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-white"
              >
                Start Over
              </button>
            </div>
          </motion.div>
        ) : null}

        {/* Script Studio Link */}
        {!hasResults && !isGenerating ? (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={onOpenScriptStudio}
              className="text-sm text-zinc-600 transition hover:text-zinc-400"
            >
              Need a script instead? Open NoesaaAI Script Studio
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function formatDuration(value: number | null) {
  return typeof value === "number" ? `${Math.round(value)}s` : "--";
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`;
}
