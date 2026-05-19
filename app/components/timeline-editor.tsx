"use client";

import { useState } from "react";

type Caption = {
  start: number;
  end: number;
  text: string;
};

type Props = {
  duration: number;
  captions: Caption[];
  onCaptionsChange: (captions: Caption[]) => void;
};

export default function TimelineEditor({
  duration,
  captions,
  onCaptionsChange,
}: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  function handleTextClick(idx: number) {
    setEditingIdx(idx);
    setEditText(captions[idx].text);
  }

  function handleTextSave() {
    if (editingIdx === null) return;
    const updated = [...captions];
    updated[editingIdx] = { ...updated[editingIdx], text: editText };
    onCaptionsChange(updated);
    setEditingIdx(null);
  }

  function handleDragStart(idx: number, edge: "start" | "end", e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const barWidth = (e.target as HTMLElement).closest("[data-timeline]")?.clientWidth || 600;
    const startVal = edge === "start" ? captions[idx].start : captions[idx].end;

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dTime = (dx / barWidth) * duration;
      const updated = [...captions];
      if (edge === "start") {
        updated[idx] = { ...updated[idx], start: Math.max(0, Math.min(updated[idx].end - 0.1, startVal + dTime)) };
      } else {
        updated[idx] = { ...updated[idx], end: Math.min(duration, Math.max(updated[idx].start + 0.1, startVal + dTime)) };
      }
      onCaptionsChange(updated);
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase text-zinc-500">
        Caption Timeline
      </p>

      <div
        data-timeline
        className="relative h-10 rounded-lg border border-zinc-800 bg-zinc-900"
      >
        {captions.map((cap, i) => {
          const left = (cap.start / duration) * 100;
          const width = ((cap.end - cap.start) / duration) * 100;
          return (
            <div
              key={i}
              className="absolute top-1 h-8 cursor-pointer rounded bg-cyan-400/20 border border-cyan-400/40"
              style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
              onClick={() => handleTextClick(i)}
            >
              <div
                className="absolute left-0 top-0 h-full w-1 cursor-ew-resize bg-cyan-400/60"
                onMouseDown={(e) => handleDragStart(i, "start", e)}
              />
              <div
                className="absolute right-0 top-0 h-full w-1 cursor-ew-resize bg-cyan-400/60"
                onMouseDown={(e) => handleDragStart(i, "end", e)}
              />
              <span className="block truncate px-1.5 text-[9px] leading-8 text-cyan-400">
                {cap.text.slice(0, 20)}
              </span>
            </div>
          );
        })}
      </div>

      {editingIdx !== null && (
        <div className="flex gap-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSave()}
            className="h-7 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-[11px] text-white outline-none focus:border-cyan-400/50"
            autoFocus
          />
          <button
            type="button"
            onClick={handleTextSave}
            className="h-7 rounded-md bg-cyan-400/10 px-2 text-[10px] text-cyan-400 hover:bg-cyan-400/20"
          >
            Save
          </button>
        </div>
      )}

      <p className="text-[9px] text-zinc-600">
        Click a segment to edit text. Drag edges to adjust timing.
      </p>
    </div>
  );
}
