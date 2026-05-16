"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Download,
  FileVideo,
  Loader2,
  Scissors,
  Upload,
} from "lucide-react";
import type {
  ClipCandidate,
  ClipGenerationResult,
  ClipPlatformTarget,
} from "@/app/lib/clips";

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

type AnalyzeResponse =
  | {
      success: true;
      result: ClipGenerationResult;
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
        downloadUrl: string;
        publicPath: string;
        duration: number;
      };
    }
  | {
      success: false;
      error?: string;
      detail?: string;
    };

const platformOptions: ClipPlatformTarget[] = [
  "reels",
  "tiktok",
  "shorts",
  "generic",
];

export default function ClipsPage() {
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [activeSourcePath, setActiveSourcePath] = useState("");
  const [platform, setPlatform] = useState<ClipPlatformTarget>("reels");
  const [maxClips, setMaxClips] = useState(3);
  const [targetDuration, setTargetDuration] = useState(30);
  const [result, setResult] = useState<ClipGenerationResult | null>(null);
  const [renderedUrl, setRenderedUrl] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [error, setError] = useState("");
  const [uploadErrors, setUploadErrors] = useState<UploadFailure[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const activeVideo =
    uploadedVideos.find((video) => video.sourcePath === activeSourcePath) ||
    null;

  async function uploadFiles(files: FileList | File[]) {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadErrors([]);
    setUploadMessage("");
    setResult(null);
    setRenderedUrl("");
    setSelectedCandidateId("");

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/clips/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as UploadResponse;
      const serverUploads = data.uploads || [];

      if (!response.ok || !data.success) {
        setUploadErrors(data.errors || []);
        throw new Error(
          !data.success ? data.detail || data.error : "Video upload failed"
        );
      }

      const usedFileIndexes = new Set<number>();
      const nextUploads = serverUploads.map((upload) => {
        const fileIndex = selectedFiles.findIndex(
          (file, index) =>
            !usedFileIndexes.has(index) &&
            file.name === upload.originalName &&
            file.size === upload.size
        );
        const matchedFile = selectedFiles[fileIndex] || selectedFiles[0];

        if (fileIndex >= 0) {
          usedFileIndexes.add(fileIndex);
        }

        return {
          ...upload,
          previewUrl: URL.createObjectURL(matchedFile),
        };
      });

      setUploadedVideos((current) => [...nextUploads, ...current]);
      setActiveSourcePath(nextUploads[0]?.sourcePath || activeSourcePath);
      setUploadErrors(data.errors || []);
      setUploadMessage(
        data.errors.length > 0
          ? "Uploaded valid videos. Some files were skipped."
          : "Uploaded successfully."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to upload videos."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function analyze() {
    if (!activeVideo) {
      setError("Upload and select a source video before analyzing clips.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setResult(null);
    setRenderedUrl("");
    setSelectedCandidateId("");

    try {
      const response = await fetch("/api/clips/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath: activeVideo.sourcePath,
          platform,
          maxClips,
          targetDuration,
        }),
      });
      const data = (await response.json()) as AnalyzeResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success ? data.detail || data.error : "Clip analysis failed"
        );
      }

      setResult(data.result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to analyze source video."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function renderCandidate(candidate: ClipCandidate) {
    if (!activeVideo) {
      setError("Select an uploaded source video before rendering.");
      return;
    }

    setIsRendering(true);
    setError("");
    setRenderedUrl("");
    setSelectedCandidateId(candidate.id);

    try {
      const response = await fetch("/api/clips/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath: activeVideo.sourcePath,
          candidate,
        }),
      });
      const data = (await response.json()) as RenderResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success ? data.detail || data.error : "Clip render failed"
        );
      }

      setRenderedUrl(data.output.downloadUrl);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to render clip."
      );
    } finally {
      setIsRendering(false);
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

  return (
    <main className="min-h-screen bg-[#070907] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-lime-200"
            >
              <ArrowLeft className="size-4" />
              Prompt-to-reel
            </Link>
            <h1 className="text-2xl font-semibold text-white">
              Clip Generator
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Upload local videos, analyze short-form candidates, and render
              selected clips.
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-lg border border-lime-300/30 bg-lime-300/10 text-lime-200">
            <Scissors className="size-5" />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid h-fit gap-4">
            <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-5">
              <div className="mb-5 flex items-center gap-2 text-lime-200">
                <Upload className="size-5" />
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  Upload Source Videos
                </h2>
              </div>

              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`grid min-h-48 cursor-pointer place-items-center rounded-lg border border-dashed p-6 text-center transition ${
                  isDragging
                    ? "border-lime-300 bg-lime-300/10"
                    : "border-white/15 bg-black/20 hover:border-lime-300/50"
                }`}
              >
                <input
                  type="file"
                  accept=".mp4,.mov,.mkv,.webm,video/mp4,video/webm,video/quicktime"
                  multiple
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <span className="grid gap-3">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-lime-300/10 text-lime-200">
                    {isUploading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <FileVideo className="size-5" />
                    )}
                  </span>
                  <span className="text-base font-semibold text-white">
                    Drop videos here or browse files
                  </span>
                  <span className="text-sm leading-6 text-zinc-400">
                    Supports MP4, MOV, MKV, and WEBM. Files are saved locally to
                    assets/footage/uploads/.
                  </span>
                </span>
              </label>

              {uploadMessage ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-lime-300/30 bg-lime-300/10 p-3 text-sm text-lime-100">
                  <Check className="size-4" />
                  {uploadMessage}
                </div>
              ) : null}

              {uploadErrors.length > 0 ? (
                <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-950/30 p-3 text-sm text-amber-100">
                  {uploadErrors.map((item) => (
                    <p key={`${item.filename}-${item.error}`}>
                      {item.filename}: {item.error}
                    </p>
                  ))}
                </div>
              ) : null}
            </section>

            {uploadedVideos.length > 0 ? (
              <section className="grid gap-3">
                {uploadedVideos.map((video) => {
                  const isActive = video.sourcePath === activeSourcePath;

                  return (
                    <button
                      key={video.sourcePath}
                      type="button"
                      onClick={() => {
                        setActiveSourcePath(video.sourcePath);
                        setResult(null);
                        setRenderedUrl("");
                        setSelectedCandidateId("");
                      }}
                      className={`rounded-lg border p-3 text-left transition ${
                        isActive
                          ? "border-lime-300/60 bg-lime-300/10"
                          : "border-white/10 bg-zinc-950/80 hover:border-lime-300/40"
                      }`}
                    >
                      <video
                        src={video.previewUrl}
                        controls
                        className="aspect-video w-full rounded-md bg-black object-contain"
                      />
                      <div className="mt-3 grid gap-1 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-white">
                            {video.filename}
                          </p>
                          {isActive ? (
                            <span className="rounded-md bg-lime-300 px-2 py-1 text-xs font-bold text-zinc-950">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <p className="text-zinc-400">
                          Duration: {formatDuration(video.duration)}
                        </p>
                        <p className="text-zinc-400">
                          Size: {formatBytes(video.size)}
                        </p>
                        <p className="break-all text-xs text-zinc-500">
                          {video.sourcePath}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </section>
            ) : null}

            <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Platform
                  </span>
                  <select
                    value={platform}
                    onChange={(event) =>
                      setPlatform(event.target.value as ClipPlatformTarget)
                    }
                    className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-lime-300/60"
                  >
                    {platformOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Max clips
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={maxClips}
                    onChange={(event) => setMaxClips(Number(event.target.value))}
                    className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-lime-300/60"
                  />
                </label>
              </div>

              <label className="mt-4 grid gap-2">
                <span className="text-sm font-medium text-zinc-300">
                  Target duration
                </span>
                <input
                  type="number"
                  min={15}
                  max={45}
                  value={targetDuration}
                  onChange={(event) =>
                    setTargetDuration(Number(event.target.value))
                  }
                  className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-lime-300/60"
                />
              </label>

              <button
                type="button"
                disabled={!activeVideo || isAnalyzing || isUploading}
                onClick={analyze}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {isAnalyzing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Analyze Clips
              </button>
            </section>
          </div>

          <section className="grid h-fit gap-4">
            {error ? (
              <div className="rounded-lg border border-red-400/30 bg-red-950/40 p-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            {renderedUrl ? (
              <div className="rounded-lg border border-lime-300/30 bg-zinc-950/80 p-4">
                <p className="mb-3 text-sm font-semibold text-lime-200">
                  Render complete
                </p>
                <video
                  src={renderedUrl}
                  controls
                  className="mb-4 aspect-[9/16] max-h-[520px] w-full rounded-md bg-black object-contain"
                />
                <a
                  href={renderedUrl}
                  className="inline-flex h-11 w-fit items-center gap-2 rounded-lg border border-lime-300/30 bg-lime-300/10 px-4 text-sm font-semibold text-lime-100 transition hover:bg-lime-300/20"
                >
                  <Download className="size-4" />
                  Download rendered clip
                </a>
              </div>
            ) : null}

            {result ? (
              <div className="grid gap-4">
                <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-4">
                  <p className="text-sm text-zinc-400">
                    Source duration: {result.metadata.duration}s
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    {result.candidates.length} clip candidates
                  </h2>
                </div>

                {result.candidates.map((candidate) => (
                  <article
                    key={candidate.id}
                    className="rounded-lg border border-white/10 bg-zinc-950/80 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-lime-200">
                          {candidate.platform} / {candidate.startTime}s -{" "}
                          {candidate.endTime}s
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-white">
                          {candidate.title}
                        </h3>
                      </div>
                      <div className="rounded-md bg-lime-300 px-2 py-1 text-sm font-bold text-zinc-950">
                        {candidate.score}%
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-zinc-300">
                      <p>
                        <span className="text-zinc-500">Hook:</span>{" "}
                        {candidate.suggestedHook}
                      </p>
                      <p>
                        <span className="text-zinc-500">Caption:</span>{" "}
                        {candidate.suggestedCaption}
                      </p>
                      <p>
                        <span className="text-zinc-500">Reason:</span>{" "}
                        {candidate.reason}
                      </p>
                      <p className="text-zinc-400">
                        {candidate.suggestedHashtags.join(" ")}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isRendering}
                      onClick={() => renderCandidate(candidate)}
                      className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-zinc-100 transition hover:border-lime-300/40 hover:text-lime-100 disabled:cursor-not-allowed disabled:text-zinc-500"
                    >
                      {isRendering && selectedCandidateId === candidate.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Scissors className="size-4" />
                      )}
                      Render Clip
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 bg-zinc-950/60 p-8 text-center text-sm text-zinc-500">
                Upload a video and analyze it to see clip candidates.
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function formatDuration(value: number | null) {
  return typeof value === "number" ? `${value}s` : "unknown";
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`;
}
