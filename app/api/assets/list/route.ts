import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { footageUploadsDir, ensureRenderDirectories } from "@/app/lib/ffmpeg/assets";
import { probeVideoDuration } from "@/app/lib/clips";

export const runtime = "nodejs";

const videoExtensions = new Set([".mp4", ".mov", ".mkv", ".webm"]);

type AssetEntry = {
  filename: string;
  originalName: string;
  size: number;
  duration: number | null;
  uploadedAt: string;
  previewUrl: string;
};

export async function GET() {
  try {
    await ensureRenderDirectories();
    const entries = await readdir(footageUploadsDir, { withFileTypes: true });
    const files = entries.filter(
      (e) => e.isFile() && videoExtensions.has(path.extname(e.name).toLowerCase())
    );

    const assets: AssetEntry[] = await Promise.all(
      files.map(async (entry) => {
        const filePath = path.join(footageUploadsDir, entry.name);
        const fileStat = await stat(filePath);
        let duration: number | null = null;

        try {
          duration = await probeVideoDuration(filePath);
        } catch {
          // ffprobe may fail for some files
        }

        // Extract original name: strip UUID suffix (last 9 chars before extension)
        const ext = path.extname(entry.name);
        const base = path.basename(entry.name, ext);
        const uuidSuffix = base.slice(-9); // e.g. "-f0eb22f8"
        const originalName =
          uuidSuffix.startsWith("-") && /^[a-f0-9]{8}$/.test(uuidSuffix.slice(1))
            ? base.slice(0, -9) + ext
            : entry.name;

        return {
          filename: entry.name,
          originalName,
          size: fileStat.size,
          duration: duration ? Math.round(duration * 100) / 100 : null,
          uploadedAt: fileStat.mtime.toISOString(),
          previewUrl: `/api/assets/preview/${encodeURIComponent(entry.name)}`,
        };
      })
    );

    // Sort by upload date, newest first
    assets.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return NextResponse.json(assets);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to list assets", detail: message }, { status: 500 });
  }
}
