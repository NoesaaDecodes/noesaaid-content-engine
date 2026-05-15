export type DurationMode = "short" | "medium" | "long";
export type SubtitleSize = "small" | "medium" | "large";
export type RenderQuality = "draft" | "standard" | "high";

export type RenderSettings = {
  durationMode: DurationMode;
  subtitleSize: SubtitleSize;
  quality: RenderQuality;
};

export const defaultRenderSettings: RenderSettings = {
  durationMode: "medium",
  subtitleSize: "medium",
  quality: "standard",
};

export const durationModes = ["short", "medium", "long"] as const;
export const subtitleSizes = ["small", "medium", "large"] as const;
export const renderQualities = ["draft", "standard", "high"] as const;

export const durationMultipliers: Record<DurationMode, number> = {
  short: 0.78,
  medium: 1,
  long: 1.28,
};

export const subtitleSizeScale: Record<SubtitleSize, number> = {
  small: 0.86,
  medium: 1,
  large: 1.16,
};

export const qualityOptions: Record<
  RenderQuality,
  { crf: string; preset: string; audioBitrate: string }
> = {
  draft: { crf: "28", preset: "ultrafast", audioBitrate: "96k" },
  standard: { crf: "23", preset: "veryfast", audioBitrate: "128k" },
  high: { crf: "19", preset: "medium", audioBitrate: "160k" },
};

export function normalizeRenderSettings(input: {
  durationMode?: string;
  subtitleSize?: string;
  quality?: string;
}): RenderSettings {
  return {
    durationMode: durationModes.includes(input.durationMode as DurationMode)
      ? (input.durationMode as DurationMode)
      : defaultRenderSettings.durationMode,
    subtitleSize: subtitleSizes.includes(input.subtitleSize as SubtitleSize)
      ? (input.subtitleSize as SubtitleSize)
      : defaultRenderSettings.subtitleSize,
    quality: renderQualities.includes(input.quality as RenderQuality)
      ? (input.quality as RenderQuality)
      : defaultRenderSettings.quality,
  };
}
