import type { Pacing } from "@/app/lib/templates";

export type RetentionEmphasis = "hook" | "body" | "final";

export type DopamineBeat = {
  sceneIndex: number;
  intensity: number;
  reason: string;
};

export type SubtitleEmphasisHint = {
  sceneIndex: number;
  emphasis: RetentionEmphasis;
  holdMultiplier: number;
  boost: number;
  highlight: boolean;
};

export type SceneCompositionHint = {
  sceneIndex: number;
  framing: "tight" | "balanced" | "wide";
  motionIntensity: number;
  overlayBias: "top" | "center" | "bottom";
};

export type RetentionPacingProfile = {
  pacing: Pacing;
  introHold: number;
  hookMultiplier: number;
  bodyMultiplier: number;
  finalMultiplier: number;
  gapMultiplier: number;
  ctaHold: number;
};

export type RetentionPlan = {
  scrollStopScore: number;
  pacingProfile: RetentionPacingProfile;
  dopamineBeats: DopamineBeat[];
  loopFriendlyEnding: boolean;
  subtitleEmphasisPlan: SubtitleEmphasisHint[];
  sceneCompositionHints: SceneCompositionHint[];
};

