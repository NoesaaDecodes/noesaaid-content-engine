export type DurationMode = "short" | "medium" | "long";
export type SubtitleSize = "small" | "medium" | "large";
export type RenderQuality = "draft" | "standard" | "high";

export type CaptionStyleId = "classic" | "bold" | "minimal" | "neon";

export type CaptionStyle = {
  fontColor: string;
  shadowX: number;
  shadowY: number;
  shadowColor: string;
  borderWidth: number;
  borderColor: string;
};

export const captionStyles: Record<CaptionStyleId, CaptionStyle> = {
  classic: {
    fontColor: "#FFE600",
    shadowX: 3,
    shadowY: 3,
    shadowColor: "black@0.9",
    borderWidth: 0,
    borderColor: "black",
  },
  bold: {
    fontColor: "#FFFFFF",
    shadowX: 4,
    shadowY: 4,
    shadowColor: "black@0.95",
    borderWidth: 2,
    borderColor: "black@0.8",
  },
  minimal: {
    fontColor: "#FFFFFF",
    shadowX: 0,
    shadowY: 0,
    shadowColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
  },
  neon: {
    fontColor: "#00FFFF",
    shadowX: 2,
    shadowY: 2,
    shadowColor: "#00FFFF@0.6",
    borderWidth: 3,
    borderColor: "#00FFFF@0.4",
  },
};

export const captionStyleIds = ["classic", "bold", "minimal", "neon"] as const;

export type CaptionFontColor = "#FFE600" | "#FFFFFF" | "#00FFFF" | "#FF8C00" | "#FF69B4";
export type CaptionFontSize = "small" | "medium" | "large";
export type CaptionBackground = "dark" | "light" | "none" | "glow";
export type CaptionPosition = "top" | "center" | "bottom";

export type CaptionStyleParams = {
  fontColor: CaptionFontColor;
  fontSize: CaptionFontSize;
  background: CaptionBackground;
  position: CaptionPosition;
  hookPosition: CaptionPosition;
};

export const defaultCaptionStyleParams: CaptionStyleParams = {
  fontColor: "#FFE600",
  fontSize: "medium",
  background: "dark",
  position: "bottom",
  hookPosition: "top",
};

export const captionFontSizes: Record<CaptionFontSize, number> = {
  small: 36,
  medium: 48,
  large: 60,
};

export const captionPositions: Record<CaptionPosition, string> = {
  top: "h*0.10",
  center: "h*0.45",
  bottom: "h*0.80",
};

export type RenderSettings = {
  durationMode: DurationMode;
  subtitleSize: SubtitleSize;
  quality: RenderQuality;
  captionStyle: CaptionStyleId;
};

export const defaultRenderSettings: RenderSettings = {
  durationMode: "medium",
  subtitleSize: "medium",
  quality: "standard",
  captionStyle: "classic",
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
  standard: { crf: "23", preset: "superfast", audioBitrate: "128k" },
  high: { crf: "19", preset: "medium", audioBitrate: "160k" },
};

export function normalizeRenderSettings(input: {
  durationMode?: string;
  subtitleSize?: string;
  quality?: string;
  captionStyle?: string;
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
    captionStyle: captionStyleIds.includes(
      input.captionStyle as CaptionStyleId
    )
      ? (input.captionStyle as CaptionStyleId)
      : defaultRenderSettings.captionStyle,
  };
}
