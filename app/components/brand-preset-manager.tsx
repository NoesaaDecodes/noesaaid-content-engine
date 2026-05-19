"use client";

import { useState, useEffect } from "react";
import { Save, Trash2, Upload } from "lucide-react";
import {
  loadBrandPresets,
  saveBrandPreset,
  deleteBrandPreset,
  createBrandPresetId,
  type BrandPreset,
} from "@/app/lib/brand/brand-presets";
import { showToast } from "@/app/components/toast";

type Props = {
  currentSettings: {
    fontColor: string;
    fontSize: "small" | "medium" | "large";
    background: "none" | "dark" | "light" | "glow";
    captionEffect: string;
    hookPosition: string;
    captionPosition: string;
    blurBackground: boolean;
  };
  currentTone: string;
  currentLanguage: string;
  onLoad: (preset: BrandPreset) => void;
};

export default function BrandPresetManager({
  currentSettings,
  currentTone,
  currentLanguage,
  onLoad,
}: Props) {
  const [presets, setPresets] = useState<BrandPreset[]>([]);
  const [newName, setNewName] = useState("");
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    setPresets(loadBrandPresets());
  }, []);

  function handleSave() {
    if (!newName.trim()) {
      showToast("Enter a preset name", "error");
      return;
    }

    const preset: BrandPreset = {
      id: createBrandPresetId(),
      name: newName.trim(),
      fontColor: currentSettings.fontColor,
      fontSize: currentSettings.fontSize,
      background: currentSettings.background as BrandPreset["background"],
      captionEffect: currentSettings.captionEffect as BrandPreset["captionEffect"],
      hookPosition: currentSettings.hookPosition as BrandPreset["hookPosition"],
      captionPosition: currentSettings.captionPosition as BrandPreset["captionPosition"],
      defaultTone: currentTone,
      defaultLanguage: currentLanguage,
      musicCategory: "",
      blurBackground: currentSettings.blurBackground,
    };

    saveBrandPreset(preset);
    setPresets(loadBrandPresets());
    setNewName("");
    setShowSave(false);
    showToast("Brand preset saved!", "success");
  }

  function handleDelete(id: string) {
    deleteBrandPreset(id);
    setPresets(loadBrandPresets());
    showToast("Preset deleted", "info");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase text-zinc-500">
          Brand Presets
        </p>
        <button
          type="button"
          onClick={() => setShowSave(!showSave)}
          className="flex h-6 items-center gap-1 rounded-md border border-zinc-800 px-2 text-[10px] text-zinc-400 hover:border-cyan-400/30 hover:text-cyan-400"
        >
          <Save className="size-3" />
          Save
        </button>
      </div>

      {showSave && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Preset name..."
            className="h-7 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-[11px] text-white outline-none focus:border-cyan-400/50"
          />
          <button
            type="button"
            onClick={handleSave}
            className="h-7 rounded-md bg-cyan-400/10 px-2 text-[10px] text-cyan-400 hover:bg-cyan-400/20"
          >
            Save
          </button>
        </div>
      )}

      {presets.length > 0 && (
        <div className="space-y-1.5">
          {presets.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5"
            >
              <span className="text-[11px] text-zinc-300">{p.name}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onLoad(p)}
                  className="rounded p-1 text-zinc-500 hover:text-cyan-400"
                  title="Load preset"
                >
                  <Upload className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="rounded p-1 text-zinc-500 hover:text-red-400"
                  title="Delete preset"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {presets.length === 0 && !showSave && (
        <p className="text-[10px] text-zinc-600">No saved presets yet.</p>
      )}
    </div>
  );
}
