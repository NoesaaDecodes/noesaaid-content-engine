import type { Pacing, ReelTemplate } from "@/app/lib/templates";
import {
  durationMultipliers,
  type RenderSettings,
} from "@/app/lib/render-settings";
import type { RetentionPlan } from "@/app/lib/retention";

export type SubtitleScene = {
  text: string;
  start: number;
  end: number;
  emphasis: "hook" | "body" | "final";
  isImpact: boolean;
  retentionBoost: number;
};

const pacingConfig: Record<
  Pacing,
  { min: number; max: number; wordFactor: number; base: number; gap: number }
> = {
  fast: { min: 1.35, max: 2.9, wordFactor: 0.32, base: 0.9, gap: 0.08 },
  balanced: { min: 1.7, max: 3.6, wordFactor: 0.38, base: 1.1, gap: 0.12 },
  slow: { min: 2.1, max: 4.5, wordFactor: 0.48, base: 1.35, gap: 0.16 },
};

const impactWords = [
  "DOMINASI",
  "MENANG",
  "KALAH",
  "MENTAL",
  "SAVAGE",
  "BLACK",
  "JUARA",
  "BOSS",
  "GILA",
  "TAK TERHENTIKAN",
];

export function normalizeScriptLines(script: string[] | string) {
  const lines = Array.isArray(script)
    ? script
    : script
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

  return lines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 18);
}

export function buildSubtitleScenes(
  script: string[] | string,
  template: ReelTemplate,
  settings: RenderSettings,
  retentionPlan?: RetentionPlan
) {
  const lines = normalizeScriptLines(script);
  const fallbackLines = lines.length > 0 ? lines : ["AI REELS"];
  const pacing = pacingConfig[template.pacing];
  const durationMultiplier = durationMultipliers[settings.durationMode];
  const retentionProfile = retentionPlan?.pacingProfile;
  const estimatedDurations = fallbackLines.map((line, index) => {
    const wordCount = line.split(/\s+/).filter(Boolean).length;
    const hint = retentionPlan?.subtitleEmphasisPlan.find(
      (item) => item.sceneIndex === index
    );
    const emphasisMultiplier =
      index === 0 ? 0.82 : index === fallbackLines.length - 1 ? 1.16 : 1;
    const retentionMultiplier =
      index === 0
        ? retentionProfile?.hookMultiplier
        : index === fallbackLines.length - 1
          ? retentionProfile?.finalMultiplier
          : retentionProfile?.bodyMultiplier;
    const baseDuration = clamp(
      wordCount * pacing.wordFactor + pacing.base,
      pacing.min,
      pacing.max
    );
    return clamp(
      baseDuration *
        durationMultiplier *
        emphasisMultiplier *
        (retentionMultiplier || 1) *
        (hint?.holdMultiplier || 1),
      0.9,
      5.8
    );
  });

  let cursor =
    clamp(retentionProfile?.introHold || template.introStyle.duration, 0.2, 2.5) +
    0.18;
  const scenes = fallbackLines.map((line, index) => {
    const start = roundTime(cursor);
    const end = roundTime(start + estimatedDurations[index]);
    const hint = retentionPlan?.subtitleEmphasisPlan.find(
      (item) => item.sceneIndex === index
    );
    const emphasis: SubtitleScene["emphasis"] =
      hint?.emphasis ||
      (index === 0
        ? "hook"
        : index === fallbackLines.length - 1
          ? "final"
          : "body");
    cursor = end + pacing.gap * (retentionProfile?.gapMultiplier || 1);

    return {
      text: formatSubtitleText(line, template.fontStyle.uppercase),
      start,
      end,
      emphasis,
      isImpact: hasImpactWord(line) || Boolean(hint?.highlight),
      retentionBoost: hint?.boost || 0,
    };
  });

  return {
    scenes,
    duration: Math.max(
      8,
      roundTime(cursor + clamp(template.transitionStyle.fadeOut, 0.1, 2) + 0.8)
    ),
  };
}

function hasImpactWord(line: string) {
  const normalized = formatSubtitleText(line, true);
  return impactWords.some((word) => normalized.includes(word));
}

export function formatSubtitleText(text: string, uppercase = true) {
  const formatted = text
    .normalize("NFKC")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();

  return uppercase ? formatted.toUpperCase() : formatted;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundTime(value: number) {
  return Math.round(value * 100) / 100;
}
