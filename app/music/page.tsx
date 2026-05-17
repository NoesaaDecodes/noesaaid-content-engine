"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Loader2,
  Music,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

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

const categoryOrder = ["upbeat", "lofi", "cinematic", "funny"] as const;
const categoryLabels: Record<string, string> = {
  upbeat: "Upbeat",
  lofi: "Lo-Fi",
  cinematic: "Cinematic",
  funny: "Funny",
};

export default function MusicPage() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadCatalog() {
    try {
      const res = await fetch("/api/music/catalog");
      const data = (await res.json()) as CatalogResponse;
      if (data.success && data.catalog) {
        setTracks(data.catalog);
      }
    } catch {
      setError("Failed to load music catalog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  async function deleteTrack(id: string) {
    setDeleting(id);
    setError("");
    try {
      const res = await fetch(`/api/music/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Delete failed");
      }
      setTracks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/music/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }
      await loadCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  }

  const grouped = categoryOrder.map((cat) => ({
    category: cat,
    label: categoryLabels[cat],
    tracks: tracks.filter((t) => t.category === cat),
  }));

  const userTracks = tracks.filter((t) => t.source === "user");

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
            NoesaaID
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Music Library
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Background music for your clips. Upload your own or use bundled
            tracks.
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-medium text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          Upload track
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".mp3,.wav,.m4a,.aac"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-cyan-400" />
        </div>
      ) : tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 py-20 text-center">
          <Music className="mb-4 size-10 text-zinc-700" />
          <p className="text-base font-medium text-zinc-400">
            No music tracks yet
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Upload an mp3, wav, m4a, or aac file to get started.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-medium text-black transition hover:bg-cyan-300"
          >
            <Plus className="size-3.5" />
            Upload track
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Bundled tracks by category */}
          {grouped.map(
            (group) =>
              group.tracks.length > 0 && (
                <motion.section
                  key={group.category}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                    {group.label}
                  </h2>
                  <div className="space-y-2">
                    {group.tracks.map((track) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        deleting={deleting === track.id}
                        onDelete={() => void deleteTrack(track.id)}
                      />
                    ))}
                  </div>
                </motion.section>
              )
          )}

          {/* User uploads section */}
          {userTracks.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                Your Uploads
              </h2>
              <div className="space-y-2">
                {userTracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    deleting={deleting === track.id}
                    onDelete={() => void deleteTrack(track.id)}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </div>
      )}
    </div>
  );
}

function TrackRow({
  track,
  deleting,
  onDelete,
}: {
  track: MusicTrack;
  deleting: boolean;
  onDelete: () => void;
}) {
  const isBundled = track.source !== "user";

  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 transition hover:border-zinc-700">
      <Music className="size-4 shrink-0 text-zinc-600" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{track.title}</p>
        <p className="text-[11px] text-zinc-500">
          {track.category}
          {track.downloaded ? "" : " (not downloaded)"}
        </p>
      </div>
      {isBundled ? (
        <a
          href="https://mixkit.co/free-stock-music/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] text-zinc-500 transition hover:text-cyan-400"
        >
          Mixkit
          <ExternalLink className="size-3" />
        </a>
      ) : (
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-600 transition hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
          aria-label={`Delete ${track.title}`}
        >
          {deleting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
