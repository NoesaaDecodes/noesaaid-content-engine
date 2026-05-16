export type TextPosition = "upper" | "center" | "lower";
export type Pacing = "fast" | "balanced" | "slow";
export type MotionProfile =
  | "zoomIn"
  | "zoomOut"
  | "slowPan"
  | "punchZoom"
  | "subtleShake"
  | "none";

export type ReelTemplate = {
  id: string;
  name: string;
  description: string;
  subtitleStyle: {
    fontSize: number;
    fontColor: string;
    borderWidth: number;
    boxOpacity: number;
    lineSpacing: number;
  };
  overlayStyle: {
    bottomOpacity: number;
    topOpacity: number;
  };
  fontStyle: {
    weight: "bold" | "regular";
    uppercase: boolean;
  };
  introStyle: {
    text: string;
    duration: number;
  };
  transitionStyle: {
    fadeIn: number;
    fadeOut: number;
  };
  textPosition: TextPosition;
  accentColor: string;
  pacing: Pacing;
  motionProfile: MotionProfile;
};

export const reelTemplates = [
  {
    id: "modern-sport",
    name: "Modern Sport",
    description: "Bold, high-contrast subtitles with energetic pacing.",
    subtitleStyle: {
      fontSize: 64,
      fontColor: "white",
      borderWidth: 4,
      boxOpacity: 0.32,
      lineSpacing: 12,
    },
    overlayStyle: {
      bottomOpacity: 190,
      topOpacity: 55,
    },
    fontStyle: {
      weight: "bold",
      uppercase: true,
    },
    introStyle: {
      text: "NOESAAID REELS",
      duration: 0.85,
    },
    transitionStyle: {
      fadeIn: 0.35,
      fadeOut: 0.25,
    },
    textPosition: "lower",
    accentColor: "C7F542",
    pacing: "fast",
    motionProfile: "punchZoom",
  },
  {
    id: "cinematic-dark",
    name: "Cinematic Dark",
    description: "Deeper overlay, slower pacing, clean premium title feel.",
    subtitleStyle: {
      fontSize: 58,
      fontColor: "F5F5F5",
      borderWidth: 3,
      boxOpacity: 0.42,
      lineSpacing: 14,
    },
    overlayStyle: {
      bottomOpacity: 220,
      topOpacity: 90,
    },
    fontStyle: {
      weight: "bold",
      uppercase: false,
    },
    introStyle: {
      text: "SHORT VIDEO ENGINE",
      duration: 1.15,
    },
    transitionStyle: {
      fadeIn: 0.55,
      fadeOut: 0.45,
    },
    textPosition: "center",
    accentColor: "E5E7EB",
    pacing: "slow",
    motionProfile: "slowPan",
  },
  {
    id: "minimal-clean",
    name: "Minimal Clean",
    description: "Light overlay and compact typography for explainers.",
    subtitleStyle: {
      fontSize: 52,
      fontColor: "FFFFFF",
      borderWidth: 2,
      boxOpacity: 0.24,
      lineSpacing: 10,
    },
    overlayStyle: {
      bottomOpacity: 145,
      topOpacity: 35,
    },
    fontStyle: {
      weight: "regular",
      uppercase: false,
    },
    introStyle: {
      text: "AI REELS",
      duration: 0.65,
    },
    transitionStyle: {
      fadeIn: 0.25,
      fadeOut: 0.2,
    },
    textPosition: "lower",
    accentColor: "38BDF8",
    pacing: "balanced",
    motionProfile: "zoomIn",
  },
  {
    id: "aggressive-hype",
    name: "Aggressive Hype",
    description: "Large punchy subtitles with fast cuts and strong contrast.",
    subtitleStyle: {
      fontSize: 74,
      fontColor: "FFFFFF",
      borderWidth: 5,
      boxOpacity: 0.46,
      lineSpacing: 8,
    },
    overlayStyle: {
      bottomOpacity: 235,
      topOpacity: 70,
    },
    fontStyle: {
      weight: "bold",
      uppercase: true,
    },
    introStyle: {
      text: "WATCH THIS",
      duration: 0.55,
    },
    transitionStyle: {
      fadeIn: 0.18,
      fadeOut: 0.18,
    },
    textPosition: "center",
    accentColor: "F97316",
    pacing: "fast",
    motionProfile: "subtleShake",
  },
] satisfies ReelTemplate[];

export const defaultTemplateId = "modern-sport";

export function getTemplateById(templateId: string | undefined) {
  return (
    reelTemplates.find((template) => template.id === templateId) ||
    reelTemplates.find((template) => template.id === defaultTemplateId) ||
    reelTemplates[0]
  );
}
