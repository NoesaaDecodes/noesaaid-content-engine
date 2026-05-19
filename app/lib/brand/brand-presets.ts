import type { CaptionEffect } from "@/app/lib/ffmpeg/clipper";
import type { CaptionPosition } from "@/app/lib/render-settings";

export type BrandPreset = {
  id: string;
  name: string;
  fontColor: string;
  fontSize: "small" | "medium" | "large";
  background: "none" | "dark" | "light" | "glow";
  captionEffect: CaptionEffect;
  hookPosition: CaptionPosition;
  captionPosition: CaptionPosition;
  defaultTone: string;
  defaultLanguage: string;
  musicCategory: string;
  blurBackground: boolean;
};

const STORAGE_KEY = "noesaaid_brand_presets";

export function loadBrandPresets(): BrandPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBrandPreset(preset: BrandPreset): void {
  const presets = loadBrandPresets();
  const idx = presets.findIndex((p) => p.id === preset.id);
  if (idx >= 0) {
    presets[idx] = preset;
  } else {
    presets.push(preset);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function deleteBrandPreset(id: string): void {
  const presets = loadBrandPresets().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function createBrandPresetId(): string {
  return `brand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
