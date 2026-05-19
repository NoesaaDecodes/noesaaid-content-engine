import type { CaptionEffect } from "@/app/lib/ffmpeg/clipper";
import type {
  CaptionFontColor,
  CaptionFontSize,
  CaptionBackground,
  CaptionPosition,
} from "@/app/lib/render-settings";

export type VisualPreset = {
  id: string;
  label: string;
  description: string;
  captionEffect: CaptionEffect;
  fontColor: CaptionFontColor;
  fontSize: CaptionFontSize;
  background: CaptionBackground;
  position: CaptionPosition;
  hookPosition: CaptionPosition;
  blurBackground: boolean;
  punchZoom: boolean;
};

export const VISUAL_PRESETS: VisualPreset[] = [
  {
    id: "hormozi",
    label: "Hormozi",
    description: "White text, large, clean bottom. Bold and direct.",
    captionEffect: "punch",
    fontColor: "#FFFFFF",
    fontSize: "large",
    background: "none",
    position: "bottom",
    hookPosition: "top",
    blurBackground: false,
    punchZoom: true,
  },
  {
    id: "mrbeast",
    label: "MrBeast",
    description: "Yellow text, large, dark bg, bounce energy.",
    captionEffect: "bounce",
    fontColor: "#FFE600",
    fontSize: "large",
    background: "dark",
    position: "bottom",
    hookPosition: "top",
    blurBackground: false,
    punchZoom: true,
  },
  {
    id: "podcast",
    label: "Podcast",
    description: "White text, medium, dark bg. Calm and readable.",
    captionEffect: "fade",
    fontColor: "#FFFFFF",
    fontSize: "medium",
    background: "dark",
    position: "center",
    hookPosition: "top",
    blurBackground: false,
    punchZoom: false,
  },
  {
    id: "genz",
    label: "Gen Z",
    description: "Cyan glow text, karaoke effect. Trendy and flashy.",
    captionEffect: "karaoke",
    fontColor: "#00FFFF",
    fontSize: "large",
    background: "glow",
    position: "bottom",
    hookPosition: "top",
    blurBackground: false,
    punchZoom: true,
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "White text, small, slide-up. Clean and minimal.",
    captionEffect: "slide-up",
    fontColor: "#FFFFFF",
    fontSize: "small",
    background: "none",
    position: "bottom",
    hookPosition: "top",
    blurBackground: true,
    punchZoom: false,
  },
];

export function getPresetById(id: string): VisualPreset | undefined {
  return VISUAL_PRESETS.find((p) => p.id === id);
}
