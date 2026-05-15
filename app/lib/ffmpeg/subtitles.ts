import type { Pacing, ReelTemplate } from "@/app/lib/templates";
import {
  durationMultipliers,
  type RenderSettings,
} from "@/app/lib/render-settings";

export type SubtitleScene = {
  text: string;
  start: number;
  end: number;
};

const pacingConfig: Record<
  Pacing,
  { min: number; max: number; wordFactor: number; base: number; gap: number }
> = {
  fast: { min: 1.35, max: 2.9, wordFactor: 0.32, base: 0.9, gap: 0.08 },
  balanced: { min: 1.7, max: 3.6, wordFactor: 0.38, base: 1.1, gap: 0.12 },
  slow: { min: 2.1, max: 4.5, wordFactor: 0.48, base: 1.35, gap: 0.16 },
};

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
  settings: RenderSettings
) {
  const lines = normalizeScriptLines(script);
  const fallbackLines = lines.length > 0 ? lines : ["AI REELS"];
  const pacing = pacingConfig[template.pacing];
  const durationMultiplier = durationMultipliers[settings.durationMode];
  const estimatedDurations = fallbackLines.map((line) => {
    const wordCount = line.split(/\s+/).filter(Boolean).length;
    const baseDuration = clamp(
      wordCount * pacing.wordFactor + pacing.base,
      pacing.min,
      pacing.max
    );
    return clamp(baseDuration * durationMultiplier, 1.05, 5.2);
  });

  let cursor = clamp(template.introStyle.duration, 0.2, 2.5) + 0.22;
  const scenes = fallbackLines.map((line, index) => {
    const start = roundTime(cursor);
    const end = roundTime(start + estimatedDurations[index]);
    cursor = end + pacing.gap;

    return {
      text: formatSubtitleText(line, template.fontStyle.uppercase),
      start,
      end,
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
