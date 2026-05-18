"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Music, Trash2, Upload, Volume2, VolumeX } from "lucide-react";

type MusicTrack = {
  id: string;
  title: string;
  category: string;
  filename: string;
  source: string;
  downloaded: boolean;
};

type CatalogResponse = {
  success: boolean;
  catalog?: MusicTrack[];
};

type UploadResponse = {
  success: boolean;
  track?: MusicTrack;
  error?: string;
};

type Props = {
  selectedFilename: string | null;
  volume: number;
  onSelect: (filename: string | null) => void;
  onVolumeChange: (volume: number) => void;
};

const categories = [
  { value: "all", label: "All" },
  { value: "upbeat", label: "Upbeat" },
  { value: "lofi", label: "Lo-Fi" },
  { value: "cinematic", label: "Cinematic" },
  { value: "funny", label: "Funny" },
];

export default function MusicPicker({
  selectedFilename,
  volume,
  onSelect,
  onVolumeChange,
}: Props) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/music/catalog");
        const data = (await res.json()) as CatalogResponse;
        if (!cancelled && data.success && data.catalog) {
          setTracks(data.catalog);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/music/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as UploadResponse;
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      if (data.track) {
        setTracks((prev) => {
          const exists = prev.some((t) => t.id === data.track!.id);
          return exists ? prev : [...prev, data.track!];
        });
        onSelect(data.track.filename);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  }

  async function deleteTrack(track: MusicTrack) {
    console.log("[DELETE UI]", track.id, track.filename);
    try {
      const res = await fetch("/api/music/" + encodeURIComponent(track.id), {
        method: "DELETE",
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      console.log("[DELETE UI] response:", data);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Delete failed");
      }
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      if (selectedFilename === track.filename) {
        onSelect(null);
      }
    } catch (err) {
      console.error("[DELETE UI] error:", err);
    }
  }

  const filtered =
    filter === "all" ? tracks : tracks.filter((t) => t.category === filter);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Music
        </p>
        {selectedFilename ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[11px] text-zinc-500 transition hover:text-red-400"
          >
            Remove
          </button>
        ) : null}
      </div>

      {/* Upload button — always visible */}
      <div className="mb-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          {uploading ? "Uploading..." : "Upload your own track"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".mp3,.wav,.m4a,.aac"
          onChange={handleFileChange}
          className="hidden"
        />
        {uploadError ? (
          <p className="mt-1.5 text-[11px] text-red-400">{uploadError}</p>
        ) : null}
      </div>

      {/* Category tabs */}
      <div className="mb-3 flex gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setFilter(cat.value)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
              filter === cat.value
                ? "bg-cyan-400/10 text-cyan-400"
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Track list */}
      {loading ? (
        <p className="py-4 text-center text-xs text-zinc-600">
          Loading tracks...
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-600">
          No tracks in this category
        </p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
          {filtered.map((track) => {
            const isSelected = track.filename === selectedFilename;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onSelect(isSelected ? null : track.filename)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  isSelected
                    ? "border border-cyan-400/30 bg-cyan-400/10"
                    : "border border-transparent bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                <Music
                  className={`size-4 shrink-0 ${
                    isSelected ? "text-cyan-400" : "text-zinc-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-xs font-medium ${
                      isSelected ? "text-cyan-400" : "text-zinc-300"
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="text-[10px] text-zinc-600">
                    {track.category}
                    {track.source === "user" ? " / uploaded" : ""}
                    {!track.downloaded ? " (not downloaded)" : ""}
                  </p>
                </div>
                {track.source === "user" ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteTrack(track);
                    }}
                    className="shrink-0 rounded p-1 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
                    title="Delete track"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : isSelected ? (
                  <span className="shrink-0 text-xs text-zinc-500">
                    ✕
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Volume slider */}
      {selectedFilename ? (
        <div className="mt-4 flex items-center gap-3">
          {volume === 0 ? (
            <VolumeX className="size-4 text-zinc-500" />
          ) : (
            <Volume2 className="size-4 text-zinc-500" />
          )}
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-800 accent-cyan-400"
          />
          <span className="w-8 text-right text-[11px] text-zinc-500">
            {volume}%
          </span>
        </div>
      ) : null}
    </div>
  );
}
