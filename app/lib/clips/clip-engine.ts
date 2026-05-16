import ffmpeg from "fluent-ffmpeg";
import { defaultRenderSettings } from "@/app/lib/render-settings";
import { buildRetentionPlan } from "@/app/lib/retention";
import { getTemplateById } from "@/app/lib/templates";
import type {
  ClipAspectMode,
  ClipCandidate,
  ClipGenerationOptions,
  ClipGenerationResult,
  ClipPlatformTarget,
  SourceVideoInput,
} from "./types";

const minClipDuration = 15;
const maxClipDuration = 45;
const defaultTargetDuration = 30;

export async function analyzeSourceVideo(
  source: SourceVideoInput,
  options: ClipGenerationOptions
): Promise<ClipGenerationResult> {
  const duration = source.duration || (await probeVideoDuration(source.resolvedPath || source.sourcePath));
  const safeDuration = roundTime(duration);

  if (!Number.isFinite(safeDuration) || safeDuration <= 0) {
    throw new Error("Unable to read source video duration with ffprobe.");
  }

  const normalizedOptions = normalizeClipOptions(options);
  const candidates = buildClipCandidates(
    safeDuration,
    normalizedOptions
  ).slice(0, normalizedOptions.maxClips);

  return {
    source: {
      sourcePath: source.sourcePath,
      duration: safeDuration,
    },
    candidates,
    metadata: {
      duration: safeDuration,
      platform: normalizedOptions.platform,
      maxClips: normalizedOptions.maxClips,
      targetDuration: normalizedOptions.targetDuration || defaultTargetDuration,
    },
  };
}

export async function probeVideoDuration(sourcePath: string) {
  configureFfprobePath();

  return new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(sourcePath, (error, metadata) => {
      if (error) {
        reject(new Error("ffprobe failed to inspect the source video."));
        return;
      }

      const duration = Number(metadata.format?.duration);
      if (Number.isFinite(duration) && duration > 0) {
        resolve(duration);
        return;
      }

      const streamDuration = Number(
        metadata.streams?.find((stream) => stream.codec_type === "video")
          ?.duration
      );

      if (Number.isFinite(streamDuration) && streamDuration > 0) {
        resolve(streamDuration);
        return;
      }

      reject(new Error("Source video duration is unavailable."));
    });
  });
}

export function normalizeClipOptions(
  options: Partial<ClipGenerationOptions>
): ClipGenerationOptions {
  return {
    platform: safePlatform(options.platform),
    maxClips: clampInteger(options.maxClips || 3, 1, 8),
    targetDuration: clampNumber(
      options.targetDuration || platformDefaultDuration(options.platform),
      minClipDuration,
      maxClipDuration
    ),
    aspectMode: safeAspectMode(options.aspectMode),
    templateId: options.templateId,
  };
}

function buildClipCandidates(
  sourceDuration: number,
  options: ClipGenerationOptions
): ClipCandidate[] {
  const targetDuration = options.targetDuration || defaultTargetDuration;
  const windowDuration = clampNumber(
    Math.min(targetDuration, Math.max(minClipDuration, sourceDuration - 1)),
    Math.min(8, sourceDuration),
    Math.min(maxClipDuration, sourceDuration)
  );
  const anchors = buildAnchors(sourceDuration, windowDuration);
  const template = getTemplateById(options.templateId);

  return anchors
    .map((startTime, index) => {
      const endTime = roundTime(Math.min(sourceDuration, startTime + windowDuration));
      const duration = roundTime(endTime - startTime);
      const segment = segmentName(index, anchors.length);
      const suggestedHook = hookForSegment(segment, options.platform);
      const script = [
        suggestedHook,
        `${duration}s highlight from the ${segment} section`,
        "Loop it back into the next clip",
      ];
      const retentionPlan = buildRetentionPlan({
        script,
        template,
        settings: defaultRenderSettings,
      });
      const score = scoreCandidate({
        startTime,
        duration,
        sourceDuration,
        platform: options.platform,
        retentionScore: retentionPlan.scrollStopScore,
      });

      return {
        id: `clip-${index + 1}-${Math.round(startTime * 100)}`,
        title: `${platformName(options.platform)} clip ${index + 1}: ${capitalize(segment)} highlight`,
        startTime,
        endTime,
        duration,
        score,
        reason: reasonForCandidate(segment, duration, score),
        platform: options.platform,
        suggestedHook,
        suggestedCaption: captionForSegment(segment, options.platform),
        suggestedHashtags: hashtagsForPlatform(options.platform),
        visualPlan: {
          aspectMode: options.aspectMode || "vertical",
          framing: score >= 78 ? "tight" : segment === "middle" ? "balanced" : "wide",
          motionNote: "Use steady vertical crop with clean center framing.",
          subtitleNote: "Add short hook text in the first 3 seconds.",
        },
        retentionPlan,
      } satisfies ClipCandidate;
    })
    .sort((left, right) => right.score - left.score);
}

function buildAnchors(sourceDuration: number, windowDuration: number) {
  if (sourceDuration <= windowDuration + 1) {
    return [0];
  }

  const latestStart = Math.max(0, sourceDuration - windowDuration);
  const anchors = [
    0,
    latestStart * 0.18,
    latestStart * 0.5,
    latestStart * 0.72,
    latestStart,
  ];

  return Array.from(
    new Set(anchors.map((anchor) => roundTime(clampNumber(anchor, 0, latestStart))))
  );
}

function scoreCandidate({
  startTime,
  duration,
  sourceDuration,
  platform,
  retentionScore,
}: {
  startTime: number;
  duration: number;
  sourceDuration: number;
  platform: ClipPlatformTarget;
  retentionScore: number;
}) {
  const conciseScore = 1 - Math.min(1, Math.abs(duration - platformDefaultDuration(platform)) / 24);
  const earlyBias = startTime <= sourceDuration * 0.2 ? 1 : 0.55;
  const loopBias = startTime + duration >= sourceDuration * 0.82 ? 0.82 : 0.55;
  const platformFit = duration >= 15 && duration <= 45 ? 1 : 0.5;
  const firstThreeSeconds = startTime < sourceDuration * 0.12 ? 1 : 0.68;
  const score =
    conciseScore * 24 +
    earlyBias * 18 +
    loopBias * 12 +
    platformFit * 18 +
    firstThreeSeconds * 14 +
    (retentionScore / 100) * 14;

  return Math.round(clampNumber(score, 35, 96));
}

function reasonForCandidate(segment: string, duration: number, score: number) {
  const fit =
    duration >= minClipDuration && duration <= maxClipDuration
      ? "short-form duration"
      : "fallback duration";

  return `${capitalize(segment)} section with ${fit} and ${score}% retention fit.`;
}

function hookForSegment(segment: string, platform: ClipPlatformTarget) {
  if (segment === "early") {
    return "Watch the first 3 seconds.";
  }

  if (segment === "late") {
    return "This ending is the clip.";
  }

  return platform === "shorts"
    ? "Here is the key moment."
    : "Do not miss this part.";
}

function captionForSegment(segment: string, platform: ClipPlatformTarget) {
  return `${capitalize(segment)} highlight trimmed for ${platformName(platform)}. Review the cut before posting.`;
}

function hashtagsForPlatform(platform: ClipPlatformTarget) {
  const base = ["#NoesaaID", "#ShortForm", "#AIClips"];

  if (platform === "reels") {
    return [...base, "#Reels"];
  }

  if (platform === "tiktok") {
    return [...base, "#TikTok"];
  }

  if (platform === "shorts") {
    return [...base, "#Shorts"];
  }

  return base;
}

function segmentName(index: number, total: number) {
  if (index <= 1) {
    return "early";
  }

  if (index >= total - 1) {
    return "late";
  }

  return "middle";
}

function platformDefaultDuration(platform?: ClipPlatformTarget) {
  if (platform === "tiktok") {
    return 24;
  }

  if (platform === "shorts") {
    return 35;
  }

  return defaultTargetDuration;
}

function safePlatform(value?: string): ClipPlatformTarget {
  return ["reels", "tiktok", "shorts", "generic"].includes(value || "")
    ? (value as ClipPlatformTarget)
    : "generic";
}

function safeAspectMode(value?: string): ClipAspectMode {
  return ["vertical", "centerCrop", "fit"].includes(value || "")
    ? (value as ClipAspectMode)
    : "vertical";
}

function platformName(platform: ClipPlatformTarget) {
  return platform === "shorts" ? "YouTube Shorts" : platform;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function configureFfprobePath() {
  if (process.env.FFPROBE_PATH) {
    ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
  }
}

function clampInteger(value: number, min: number, max: number) {
  return Math.round(clampNumber(value, min, max));
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function roundTime(value: number) {
  return Math.round(value * 100) / 100;
}
