"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileVideo,
  Loader2,
  Trash2,
  Upload,
  Play,
} from "lucide-react";

type AssetEntry = {
  filename: string;
  originalName: string;
  size: number;
  duration: number | null;
  uploadedAt: string;
  previewUrl: string;
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function deleteAsset(filename: string) {
    setDeleting(filename);
    try {
      const response = await fetch(
        `/api/assets/${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Delete failed");
      }
      setAssets((prev) => prev.filter((a) => a.filename !== filename));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/assets/list")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) throw new Error(data.detail || "Failed to load assets");
        setAssets(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load assets.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
            NoesaaID
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Assets</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Videos uploaded from the home page.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white"
        >
          <Upload className="size-3.5" />
          Upload new
        </Link>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-zinc-900 bg-zinc-950"
            />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 py-20 text-center">
          <FileVideo className="mb-4 size-10 text-zinc-700" />
          <p className="text-base font-medium text-zinc-400">
            No videos yet
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Upload one from the home page.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-medium text-black transition hover:bg-cyan-300"
          >
            Go to home
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset, index) => (
            <motion.article
              key={asset.filename}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition hover:border-zinc-700"
            >
              <div className="relative flex aspect-video items-center justify-center bg-black">
                <FileVideo className="size-8 text-zinc-800" />
                {asset.duration ? (
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-zinc-300">
                    {Math.round(asset.duration)}s
                  </span>
                ) : null}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-white">
                  {asset.originalName}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatBytes(asset.size)}
                  {asset.duration ? ` · ${Math.round(asset.duration)}s` : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/?source=${encodeURIComponent(asset.filename)}`}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-400 text-xs font-medium text-black transition hover:bg-cyan-300"
                  >
                    <Play className="size-3" />
                    Use this video
                  </Link>
                  <button
                    type="button"
                    disabled={deleting === asset.filename}
                    onClick={() => void deleteAsset(asset.filename)}
                    className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-600 transition hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
                    aria-label={`Delete ${asset.originalName}`}
                  >
                    {deleting === asset.filename ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`;
}
