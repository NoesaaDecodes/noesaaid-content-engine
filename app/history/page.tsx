"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileVideo,
  RefreshCw,
  Trash2,
} from "lucide-react";

type HistoryClip = {
  filename: string | null;
  downloadUrl: string | null;
  previewUrl: string | null;
  score: number;
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  startTime: number;
  endTime: number;
};

type HistoryEntry = {
  id: string;
  sourcePath: string;
  sourceFilename: string;
  generatedAt: string;
  clips: HistoryClip[];
};

const storageKey = "noesaaid_history";

function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>(readHistory);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "today" | "week">("all");

  function deleteEntry(id: string) {
    if (!confirm("Hapus history ini?")) return;
    const next = entries.filter((e) => e.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setEntries(next);
  }

  function clearAll() {
    if (!confirm("Hapus semua history?")) return;
    localStorage.removeItem(storageKey);
    setEntries([]);
  }

  const now = new Date();
  const weekAgo = now.getTime() - 7 * 86400000;

  const filtered = entries.filter((e) => {
    if (search && !e.sourceFilename.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "today") {
      const d = new Date(e.generatedAt);
      return d.toDateString() === now.toDateString();
    }
    if (filter === "week") {
      const d = new Date(e.generatedAt);
      return d.getTime() > weekAgo;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
          NoesaaID
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">History</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Previously generated clip sets. Stored locally in this browser.
        </p>
      </div>

      {/* Search + Filter + Clear All */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari history..."
          className="h-9 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
        />
        <div className="flex items-center gap-1.5">
          {(["all", "today", "week"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === f
                  ? "bg-cyan-400/10 text-cyan-400"
                  : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {f === "all" ? "Semua" : f === "today" ? "Hari ini" : "Minggu ini"}
            </button>
          ))}
          {entries.length > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="ml-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
            >
              <Trash2 className="size-3" />
              Hapus Semua
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 py-20 text-center">
          <Clock className="mb-4 size-10 text-zinc-700" />
          <p className="text-base font-medium text-zinc-400">
            {search || filter !== "all" ? "Tidak ditemukan" : "Belum ada history"}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {search || filter !== "all"
              ? "Coba kata kunci atau filter lain."
              : "Generate klip pertama dari halaman utama."}
          </p>
          {!search && filter === "all" ? (
            <Link
              href="/"
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-medium text-black transition hover:bg-cyan-300"
            >
              Go to home
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((entry, index) => {
            const isExpanded = expandedId === entry.id;

            return (
              <motion.article
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="flex shrink-0 -space-x-6">
                    {entry.clips.slice(0, 3).map((clip, ci) => (
                      <div
                        key={ci}
                        className="flex size-12 items-center justify-center rounded-lg border-2 border-zinc-950 bg-zinc-900"
                      >
                        <FileVideo className="size-5 text-zinc-600" />
                      </div>
                    ))}
                    {entry.clips.length > 3 ? (
                      <div className="flex size-12 items-center justify-center rounded-lg border-2 border-zinc-950 bg-zinc-800 text-xs font-medium text-zinc-400">
                        +{entry.clips.length - 3}
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {entry.sourceFilename}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(entry.generatedAt).toLocaleString()} ·{" "}
                      {entry.clips.length} clip
                      {entry.clips.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/?source=${encodeURIComponent(entry.sourcePath)}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-white"
                    >
                      <RefreshCw className="size-3" />
                      Again
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : entry.id)
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )}
                      {isExpanded ? "Hide" : "View"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 text-xs text-zinc-500 transition hover:border-red-500/50 hover:text-red-400"
                      aria-label="Hapus history ini"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-zinc-800"
                    >
                      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                        {entry.clips.map((clip, ci) => (
                          <div
                            key={ci}
                            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                          >
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <p className="line-clamp-1 text-xs font-medium text-white">
                                {clip.title}
                              </p>
                              <span className="shrink-0 rounded bg-cyan-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                                {clip.score}
                              </span>
                            </div>
                            <p className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                              {clip.hook}
                            </p>
                            {clip.downloadUrl ? (
                              <a
                                href={clip.downloadUrl}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-700 px-2 text-[11px] text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                              >
                                <Download className="size-2.5" />
                                Download
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
