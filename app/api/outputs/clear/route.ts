import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { outputsDir, ensureRenderDirectories } from "@/app/lib/ffmpeg/assets";

export const runtime = "nodejs";

export async function DELETE() {
  try {
    await ensureRenderDirectories();
    const entries = await readdir(outputsDir, { withFileTypes: true });
    const mp4Files = entries.filter(
      (e) => e.isFile() && path.extname(e.name).toLowerCase() === ".mp4"
    );

    let deletedCount = 0;
    for (const entry of mp4Files) {
      try {
        await unlink(path.join(outputsDir, entry.name));
        deletedCount++;
      } catch {
        // File may be locked or already deleted
      }
    }

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clear failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
