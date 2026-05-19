import ffmpeg from "fluent-ffmpeg";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { analyzeAudio, type AudioAnalysis } from "@/app/lib/audio/audio-analyzer";
import { scoreEmotionalEnergy, type EmotionScore } from "@/app/lib/audio/emotion-scorer";
import { analyzeHookStrength } from "@/app/lib/hooks/hook-analyzer";
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
const maxClipDuration = 60;
const defaultTargetDuration = 30;

export type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  probability?: number;
};

export async function analyzeSourceVideo(
  source: SourceVideoInput,
  options: ClipGenerationOptions,
  words?: TranscriptWord[]
): Promise<ClipGenerationResult> {
  const sourcePath = source.resolvedPath || source.sourcePath;

  const duration = source.duration || (await probeVideoDuration(sourcePath));
  const safeDuration = roundTime(duration);

  if (!Number.isFinite(safeDuration) || safeDuration <= 0) {
    throw new Error("Unable to read source video duration with ffprobe.");
  }

  const normalizedOptions = normalizeClipOptions(options);

  // Order 18: Fast path for long videos (> 5 minutes)
  if (safeDuration > 300) {
    // Use position-based heuristic for long videos
    const candidates = buildClipCandidates(
      safeDuration,
      normalizedOptions,
      words,
      [], // no scene changes
      null // no audio analysis
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

  const sceneChanges = await getSceneChanges(sourcePath, safeDuration);

  // Run audio analysis on full source for caching
  const fullAudio = await getAudioAnalysis(sourcePath, 0, safeDuration);

  const candidates = buildClipCandidates(
    safeDuration,
    normalizedOptions,
    words,
    sceneChanges,
    fullAudio
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

function hashSourcePath(sourcePath: string): string {
  return createHash("sha256").update(sourcePath).digest("hex").slice(0, 12);
}

async function detectSceneChanges(sourcePath: string, maxDuration?: number): Promise<number[]> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
  const args = [
    "-i", sourcePath,
  ];

  // Order 18: Limit scene detection to first 120s for long videos
  if (maxDuration && maxDuration > 0) {
    args.push("-t", maxDuration.toString());
  }

  args.push(
    "-vf", "select='gt(scene,0.3)',showinfo",
    "-f", "null",
    "-"
  );

  return new Promise((resolve) => {
    execFile(ffmpegPath, args, { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }, (_error, _stdout, stderr) => {
      const output = stderr || "";
      const times: number[] = [];

      for (const line of output.split("\n")) {
        const match = line.match(/pts_time:(\d+\.?\d*)/);
        if (match) {
          times.push(parseFloat(match[1]));
        }
      }

      resolve(times);
    });
  });
}

async function getSceneChanges(sourcePath: string, duration?: number): Promise<number[]> {
  // Order 18: Skip scene detection for videos > 5 minutes
  if (duration && duration > 300) {
    return [];
  }

  const hash = hashSourcePath(sourcePath);
  const transcriptsDir = path.join(process.cwd(), "outputs", "transcripts");
  const cachePath = path.join(transcriptsDir, `${hash}-scenes.json`);

  try {
    const cached = await fs.readFile(cachePath, "utf-8");
    return JSON.parse(cached);
  } catch {
    // Cache miss
  }

  // Order 18: Limit to first 120s for videos <= 5min
  const scenes = await detectSceneChanges(sourcePath, duration && duration <= 300 ? 120 : undefined);

  try {
    await fs.mkdir(transcriptsDir, { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(scenes));
  } catch {
    // Ignore write errors
  }

  return scenes;
}

async function getAudioAnalysis(
  sourcePath: string,
  startTime: number,
  endTime: number
): Promise<{ analysis: AudioAnalysis; emotion: EmotionScore } | null> {
  // Order 18: Skip audio analysis for videos > 5 minutes
  const duration = endTime - startTime;
  if (duration > 300) {
    return null;
  }

  const hash = hashSourcePath(sourcePath);
  const transcriptsDir = path.join(process.cwd(), "outputs", "transcripts");
  const cachePath = path.join(
    transcriptsDir,
    `${hash}-audio-${Math.round(startTime)}-${Math.round(endTime)}.json`
  );

  try {
    const cached = await fs.readFile(cachePath, "utf-8");
    return JSON.parse(cached);
  } catch {
    // Cache miss
  }

  try {
    // Order 18: Limit audio analysis to first 120s
    const limitedEndTime = Math.min(endTime, startTime + 120);
    const analysis = await analyzeAudio(sourcePath, startTime, limitedEndTime);
    const emotion = scoreEmotionalEnergy(analysis);
    const result = { analysis, emotion };

    try {
      await fs.mkdir(transcriptsDir, { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(result));
    } catch {
      // Ignore write errors
    }

    return result;
  } catch {
    return null;
  }
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
  options: ClipGenerationOptions,
  words?: TranscriptWord[],
  sceneChanges?: number[],
  fullAudio?: { analysis: AudioAnalysis; emotion: EmotionScore } | null
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
      const clipWords = words
        ? words.filter((w) => w.end > startTime && w.start < endTime)
        : undefined;
      const score = scoreCandidate({
        startTime,
        duration,
        sourceDuration,
        platform: options.platform,
        retentionScore: retentionPlan.scrollStopScore,
        words: clipWords,
        sceneChanges,
        audioEmotion: fullAudio?.emotion,
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
  words,
  sceneChanges,
  audioEmotion,
}: {
  startTime: number;
  duration: number;
  sourceDuration: number;
  platform: ClipPlatformTarget;
  retentionScore: number;
  words?: TranscriptWord[];
  sceneChanges?: number[];
  audioEmotion?: EmotionScore;
}) {
  const conciseScore = 1 - Math.min(1, Math.abs(duration - platformDefaultDuration(platform)) / 24);
  const earlyBias = startTime <= sourceDuration * 0.2 ? 1 : 0.55;
  const loopBias = startTime + duration >= sourceDuration * 0.82 ? 0.82 : 0.55;
  const platformFit = duration >= 15 && duration <= 45 ? 1 : 0.5;
  const firstThreeSeconds = startTime < sourceDuration * 0.12 ? 1 : 0.68;
  const baseScore =
    conciseScore * 24 +
    earlyBias * 18 +
    loopBias * 12 +
    platformFit * 18 +
    firstThreeSeconds * 14 +
    (retentionScore / 100) * 14;

  if (!words || words.length === 0) {
    return Math.round(clampNumber(baseScore, 35, 96));
  }

  let transcriptBonus = 0;

  // 1. Speech energy (0-20pts)
  const totalSpeechTime = words.reduce(
    (sum, w) => sum + (w.end - w.start),
    0
  );
  const wps = totalSpeechTime > 0 ? words.length / totalSpeechTime : 0;
  if (wps > 3) transcriptBonus += 10;
  const probs = words.filter((w) => w.probability != null);
  if (probs.length > 0) {
    const avgProb =
      probs.reduce((sum, w) => sum + (w.probability ?? 0), 0) / probs.length;
    if (avgProb > 0.8) transcriptBonus += 10;
  } else {
    transcriptBonus += 10;
  }

  // 2. Pacing variety (0-15pts)
  const gaps: number[] = [];
  for (let i = 1; i < words.length; i++) {
    gaps.push(words[i].start - words[i - 1].end);
  }
  const hasShort = gaps.some((g) => g < 2);
  const hasLong = gaps.some((g) => g > 4);
  if (hasShort && hasLong) transcriptBonus += 15;

  // 3. Silence ratio penalty (-20pts max)
  const speechDuration = totalSpeechTime;
  const silenceDuration = Math.max(0, duration - speechDuration);
  const silenceRatio = duration > 0 ? silenceDuration / duration : 0;
  if (silenceRatio > 0.4) transcriptBonus -= 20;
  else if (silenceRatio > 0.2) transcriptBonus -= 10;

  // 4. Opening strength + hook analysis (0-25pts)
  const firstWordStart = words[0].start - startTime;
  if (firstWordStart <= 2) transcriptBonus += 10;
  const firstSegmentText = words
    .slice(0, 8)
    .map((w) => w.word)
    .join(" ");
  const hookAnalysis = analyzeHookStrength(firstSegmentText);
  transcriptBonus += Math.round((hookAnalysis.score / 100) * 15);

  // 5. Momentum (0-20pts)
  const midPoint = startTime + duration / 2;
  const firstHalfWords = words.filter(
    (w) => w.start < midPoint
  ).length;
  const secondHalfWords = words.filter(
    (w) => w.start >= midPoint
  ).length;
  if (secondHalfWords > firstHalfWords) transcriptBonus += 20;
  else if (secondHalfWords === firstHalfWords) transcriptBonus += 10;

  // Scene change alignment bonus (+15pts if clip starts on scene change)
  if (sceneChanges && sceneChanges.length > 0) {
    const hasSceneStart = sceneChanges.some(
      (t) => Math.abs(t - startTime) < 1.0
    );
    if (hasSceneStart) transcriptBonus += 15;
  }

  // Audio emotional scoring
  if (audioEmotion) {
    // Loudness spikes in this clip window (+15)
    const clipSpikes = audioEmotion.bestMoments.filter(
      (m) => m.time >= startTime && m.time < startTime + duration
    );
    if (clipSpikes.length > 0) transcriptBonus += 15;

    // Laughter pattern detected (+20)
    if (audioEmotion.hasLaughterPattern) transcriptBonus += 20;

    // High energy variance = dynamic audio (+10)
    if (audioEmotion.energyVariance > 0.05) transcriptBonus += 10;

    // Flat audio penalty (-10)
    if (audioEmotion.energyVariance < 0.01 && audioEmotion.overallEnergy < 30) {
      transcriptBonus -= 10;
    }
  }

  const finalScore = baseScore + transcriptBonus;
  return Math.round(clampNumber(finalScore, 0, 100));
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
