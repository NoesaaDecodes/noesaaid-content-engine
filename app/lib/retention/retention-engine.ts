import type { RenderSettings } from "@/app/lib/render-settings";
import type { ReelTemplate } from "@/app/lib/templates";
import type {
  RetentionEmphasis,
  RetentionPlan,
  SceneCompositionHint,
  SubtitleEmphasisHint,
} from "./types";

type RetentionInput = {
  script: string[] | string;
  template: ReelTemplate;
  settings: RenderSettings;
};

const actionWords = [
  "menang",
  "kalah",
  "juara",
  "dominasi",
  "gila",
  "savage",
  "mental",
  "boss",
  "comeback",
  "viral",
  "terbukti",
  "tak terhentikan",
];

const questionPattern = /\?|kenapa|kok|gimana|apa|siapa|bisa/i;

export function buildRetentionPlan(input: RetentionInput): RetentionPlan {
  try {
    return createRetentionPlan(input);
  } catch {
    return fallbackRetentionPlan(input.template, normalizeLines(input.script));
  }
}

export function fallbackRetentionPlan(
  template: ReelTemplate,
  lines: string[] = []
): RetentionPlan {
  const count = Math.max(1, lines.length);

  return {
    scrollStopScore: 50,
    pacingProfile: {
      pacing: template.pacing,
      introHold: clamp(template.introStyle.duration, 0.2, 2.5),
      hookMultiplier: 0.9,
      bodyMultiplier: 1,
      finalMultiplier: 1.12,
      gapMultiplier: 1,
      ctaHold: 1.05,
    },
    dopamineBeats: count > 1 ? [{ sceneIndex: 0, intensity: 0.7, reason: "hook" }] : [],
    loopFriendlyEnding: false,
    subtitleEmphasisPlan: Array.from({ length: count }, (_, sceneIndex) =>
      buildSubtitleHint(sceneIndex, count, 0)
    ),
    sceneCompositionHints: Array.from({ length: count }, (_, sceneIndex) =>
      buildCompositionHint(sceneIndex, count, template.pacing, 0)
    ),
  };
}

function createRetentionPlan({
  script,
  template,
  settings,
}: RetentionInput): RetentionPlan {
  const lines = normalizeLines(script);
  const safeLines = lines.length > 0 ? lines : ["AI REELS"];
  const count = safeLines.length;
  const scoredLines = safeLines.map((line, index) => ({
    line,
    index,
    score: lineScore(line, index, count),
  }));
  const hookScore = scoredLines[0]?.score || 0;
  const averageScore =
    scoredLines.reduce((total, item) => total + item.score, 0) / count;
  const scrollStopScore = Math.round(
    clamp(42 + hookScore * 29 + averageScore * 14 + templateEnergy(template), 35, 96)
  );
  const fastBias = template.pacing === "fast" ? 0.08 : 0;
  const slowBias = template.pacing === "slow" ? 0.08 : 0;
  const longBias = settings.durationMode === "long" ? 0.08 : 0;

  const dopamineBeats = scoredLines
    .filter((item) => item.index === 0 || item.score >= 0.62)
    .slice(0, 5)
    .map((item) => ({
      sceneIndex: item.index,
      intensity: round(clamp(0.55 + item.score * 0.45, 0.55, 1)),
      reason: item.index === 0 ? "hook" : "keyword",
    }));

  return {
    scrollStopScore,
    pacingProfile: {
      pacing: template.pacing,
      introHold: round(
        clamp(template.introStyle.duration * (scrollStopScore > 72 ? 0.82 : 0.94), 0.2, 2.5)
      ),
      hookMultiplier: round(clamp(0.78 - fastBias + slowBias, 0.68, 0.96)),
      bodyMultiplier: round(clamp(0.98 + longBias, 0.9, 1.12)),
      finalMultiplier: round(clamp(1.12 + slowBias + longBias, 1.05, 1.28)),
      gapMultiplier: round(clamp(0.9 - fastBias + slowBias, 0.72, 1.08)),
      ctaHold: round(clamp(1.05 + slowBias + longBias, 0.85, 1.35)),
    },
    dopamineBeats,
    loopFriendlyEnding: isLoopFriendly(safeLines),
    subtitleEmphasisPlan: scoredLines.map((item) =>
      buildSubtitleHint(item.index, count, item.score)
    ),
    sceneCompositionHints: scoredLines.map((item) =>
      buildCompositionHint(item.index, count, template.pacing, item.score)
    ),
  };
}

function buildSubtitleHint(
  sceneIndex: number,
  count: number,
  score: number
): SubtitleEmphasisHint {
  const emphasis: RetentionEmphasis =
    sceneIndex === 0 ? "hook" : sceneIndex === count - 1 ? "final" : "body";
  const hookBoost = emphasis === "hook" ? 0.2 : 0;
  const finalBoost = emphasis === "final" ? 0.12 : 0;
  const boost = round(clamp(score * 0.28 + hookBoost + finalBoost, 0, 0.42));

  return {
    sceneIndex,
    emphasis,
    holdMultiplier:
      emphasis === "hook" ? 0.86 : emphasis === "final" ? 1.18 : 1,
    boost,
    highlight: score >= 0.55 || emphasis === "hook",
  };
}

function buildCompositionHint(
  sceneIndex: number,
  count: number,
  pacing: ReelTemplate["pacing"],
  score: number
): SceneCompositionHint {
  return {
    sceneIndex,
    framing: score > 0.7 ? "tight" : pacing === "slow" ? "wide" : "balanced",
    motionIntensity: round(
      clamp((pacing === "fast" ? 0.58 : pacing === "slow" ? 0.24 : 0.38) + score * 0.28, 0.15, 0.9)
    ),
    overlayBias:
      sceneIndex === 0 ? "top" : sceneIndex === count - 1 ? "bottom" : "center",
  };
}

function lineScore(line: string, index: number, count: number) {
  const normalized = line.toLowerCase();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const keywordScore = actionWords.some((word) => normalized.includes(word))
    ? 0.34
    : 0;
  const questionScore = questionPattern.test(normalized) ? 0.18 : 0;
  const shortScore = wordCount <= 7 ? 0.16 : wordCount <= 11 ? 0.08 : 0;
  const positionScore = index === 0 ? 0.24 : index === count - 1 ? 0.12 : 0;

  return clamp(keywordScore + questionScore + shortScore + positionScore, 0, 1);
}

function templateEnergy(template: ReelTemplate) {
  if (template.pacing === "fast") {
    return 8;
  }

  if (template.pacing === "slow") {
    return 1;
  }

  return 4;
}

function isLoopFriendly(lines: string[]) {
  const last = lines[lines.length - 1]?.toLowerCase() || "";
  return /lagi|ulang|next|part|besok|lanjut|akhirnya|makanya/.test(last);
}

function normalizeLines(script: string[] | string) {
  const lines = Array.isArray(script) ? script : script.split(/\r?\n/);

  return lines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 18);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

