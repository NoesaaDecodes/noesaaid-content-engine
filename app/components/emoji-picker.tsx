"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

type EmojiPickerProps = {
  onSelect: (char: string) => void;
};

const emojiTab = [
  "😂", "🤣", "😍", "🥰", "😭", "😱", "🤩", "😎", "🤔", "💀",
  "🔥", "💥", "⚡", "🎯", "💯", "✅", "❌", "👏", "🙌", "💪",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕", "💞",
  "👇", "👆", "👉", "👈", "🙏", "🤝", "👍", "👎", "✌️", "🤞",
  "🎬", "🎵", "🎤", "📸", "📱", "💻", "🌟", "⭐", "🏆", "🥇",
  "🌈", "🌊", "🌙", "☀️", "🌸", "🌺", "🦋", "🐦", "🌿", "🍃",
];

const symbolTab = [
  "→", "←", "↑", "↓", "↗", "↘", "➡", "⬅", "⬆", "⬇",
  "★", "☆", "●", "○", "■", "□", "◆", "◇", "▶", "▷",
  "✓", "✗", "✦", "✧", "•", "‣", "›", "‹", "«", "»",
];

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"emoji" | "symbol">("emoji");
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, close]);

  const items = tab === "emoji" ? emojiTab : symbolTab;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-sm transition hover:border-zinc-700 hover:bg-zinc-800"
        title="Emoji & Symbol"
      >
        <Smile className="size-4 text-zinc-400" />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              type="button"
              onClick={() => setTab("emoji")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                tab === "emoji"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Emoji
            </button>
            <button
              type="button"
              onClick={() => setTab("symbol")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                tab === "symbol"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Simbol
            </button>
          </div>

          {/* Grid */}
          <div className="max-h-[200px] overflow-y-auto p-2">
            <div className="grid grid-cols-10 gap-0.5">
              {items.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => {
                    onSelect(char);
                    close();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded text-base transition hover:bg-zinc-700"
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
