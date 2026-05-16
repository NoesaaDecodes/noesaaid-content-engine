import type { RetentionPlan } from "@/app/lib/retention";

export type ClipPlatformTarget = "reels" | "tiktok" | "shorts" | "generic";
export type ClipAspectMode = "vertical" | "centerCrop" | "fit";

export type SourceVideoInput = {
  sourcePath: string;
  resolvedPath?: string;
  duration?: number;
};

export type SourceVideoResult = {
  sourcePath: string;
  duration?: number;
};

export type ClipGenerationOptions = {
  platform: ClipPlatformTarget;
  maxClips: number;
  targetDuration?: number;
  aspectMode?: ClipAspectMode;
  templateId?: string;
};

export type ClipVisualPlan = {
  aspectMode: ClipAspectMode;
  framing: "tight" | "balanced" | "wide";
  motionNote: string;
  subtitleNote: string;
};

export type ClipCandidate = {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number;
  reason: string;
  platform: ClipPlatformTarget;
  suggestedHook: string;
  suggestedCaption: string;
  suggestedHashtags: string[];
  visualPlan: ClipVisualPlan;
  retentionPlan?: RetentionPlan;
};

export type ClipGenerationResult = {
  source: SourceVideoResult;
  candidates: ClipCandidate[];
  metadata: {
    duration: number;
    platform: ClipPlatformTarget;
    maxClips: number;
    targetDuration: number;
  };
};
