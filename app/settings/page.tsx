"use client";

import { useState } from "react";
import { Loader2, Trash2, FolderOpen, RotateCcw } from "lucide-react";
import { showToast } from "@/app/components/toast";

const settingsKey = "noesaaid_settings";
const historyKey = "noesaaid_history";

type AppSettings = {
  quality: string;
  maxClips: number;
  targetDuration: number;
  defaultEffect: string;
  defaultColor: string;
  defaultSize: string;
  defaultPosition: string;
  blurBackground: boolean;
};

const defaults: AppSettings = {
  quality: "standard",
  maxClips: 3,
  targetDuration: 30,
  defaultEffect: "fade",
  defaultColor: "#FFE600",
  defaultSize: "medium",
  defaultPosition: "bottom",
  blurBackground: false,
};

function readSettings(): AppSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(settingsKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(settingsKey, JSON.stringify(s));
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(readSettings);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState("");

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
    showToast("Pengaturan disimpan", "success");
  }

  function resetDefaults() {
    setSettings(defaults);
    saveSettings(defaults);
    showToast("Pengaturan direset ke default", "info");
  }

  async function clearOutputs() {
    setClearing(true);
    setClearMessage("");
    try {
      const response = await fetch("/api/outputs/clear", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Clear failed");
      }
      setClearMessage(`Deleted ${data.deletedCount} file(s).`);
    } catch (err) {
      setClearMessage(err instanceof Error ? err.message : "Clear failed.");
    } finally {
      setClearing(false);
    }
  }

  function clearHistory() {
    localStorage.removeItem(historyKey);
    setClearMessage("History cleared.");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10">
        <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
          NoesaaID
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Settings</h1>
      </div>

      {/* Output */}
      <section className="mb-8">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Output
        </h2>
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <SettingRow label="Default quality">
            <select
              value={settings.quality}
              onChange={(e) => update("quality", e.target.value)}
              className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-cyan-400/50"
            >
              <option value="draft">Draft</option>
              <option value="standard">Standard</option>
              <option value="high">High</option>
            </select>
          </SettingRow>
          <SettingRow label="Max clips per generation">
            <select
              value={settings.maxClips}
              onChange={(e) => update("maxClips", Number(e.target.value))}
              className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-cyan-400/50"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </SettingRow>
          <SettingRow label="Target clip duration">
            <select
              value={settings.targetDuration}
              onChange={(e) =>
                update("targetDuration", Number(e.target.value))
              }
              className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-cyan-400/50"
            >
              {[15, 30, 45, 60].map((s) => (
                <option key={s} value={s}>
                  {s}s
                </option>
              ))}
            </select>
          </SettingRow>
        </div>
      </section>

      {/* Storage */}
      <section className="mb-8">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Storage
        </h2>
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <SettingRow label="Output folder">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-500">
              <FolderOpen className="size-3.5" />
              outputs/
            </div>
          </SettingRow>
          <SettingRow label="Upload folder">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-500">
              <FolderOpen className="size-3.5" />
              assets/footage/uploads/
            </div>
          </SettingRow>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={clearing}
              onClick={() => void clearOutputs()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-400 transition hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
            >
              {clearing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Trash2 className="size-3" />
              )}
              Clear all outputs
            </button>
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-400 transition hover:border-red-500/30 hover:text-red-400"
            >
              <Trash2 className="size-3" />
              Clear upload history
            </button>
          </div>
          {clearMessage ? (
            <p className="text-xs text-zinc-500">{clearMessage}</p>
          ) : null}
        </div>
      </section>

      {/* Studio Defaults */}
      <section className="mb-8">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Studio Defaults
        </h2>
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <SettingRow label="Default effect">
            <select
              value={settings.defaultEffect}
              onChange={(e) => update("defaultEffect", e.target.value)}
              className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-cyan-400/50"
            >
              {["fade", "pop", "slide-up", "karaoke", "bounce", "punch", "shake"].map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </SettingRow>
          <SettingRow label="Default color">
            <div className="flex items-center gap-2">
              {["#FFE600", "#FFFFFF", "#00FFFF", "#FF8C00", "#FF69B4"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update("defaultColor", c)}
                  className={`size-7 rounded-md border transition ${
                    settings.defaultColor === c
                      ? "border-cyan-400/60 bg-cyan-400/15"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <span className="mx-auto block size-3 rounded-full" style={{ backgroundColor: c }} />
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Default size">
            <select
              value={settings.defaultSize}
              onChange={(e) => update("defaultSize", e.target.value)}
              className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-cyan-400/50"
            >
              {["small", "medium", "large"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </SettingRow>
          <SettingRow label="Default position">
            <select
              value={settings.defaultPosition}
              onChange={(e) => update("defaultPosition", e.target.value)}
              className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-cyan-400/50"
            >
              {["top", "center", "bottom"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </SettingRow>
          <SettingRow label="Blur background instead of black bars">
            <button
              type="button"
              onClick={() => update("blurBackground", !settings.blurBackground)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.blurBackground ? "bg-cyan-400" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform ${
                  settings.blurBackground ? "translate-x-5" : ""
                }`}
              />
            </button>
          </SettingRow>
        </div>
      </section>

      {/* Reset */}
      <section className="mb-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <button
            type="button"
            onClick={resetDefaults}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-400 transition hover:border-amber-500/30 hover:text-amber-400"
          >
            <RotateCcw className="size-3" />
            Reset ke default
          </button>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          About
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-sm">
          <p className="text-zinc-400">NoesaaID Content Engine v0.1.0</p>
          <p className="mt-1 text-xs text-zinc-600">Next.js + FFmpeg + MiMo AI</p>
        </div>
      </section>
    </div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-zinc-400">{label}</span>
      {children}
    </div>
  );
}
