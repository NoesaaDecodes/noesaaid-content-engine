import { rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { musicDir } from "@/app/lib/ffmpeg/assets";
import { removeTrackFromCatalog } from "@/app/lib/music/music-engine";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id.length > 120) {
    return NextResponse.json(
      { success: false, error: "Invalid track ID." },
      { status: 400 }
    );
  }

  const removed = await removeTrackFromCatalog(id);

  if (!removed) {
    return NextResponse.json(
      { success: false, error: "Track not found." },
      { status: 404 }
    );
  }

  if (removed.source !== "user") {
    return NextResponse.json(
      {
        success: false,
        error: "Cannot delete bundled tracks",
        detail: "Only user-uploaded tracks can be deleted.",
      },
      { status: 403 }
    );
  }

  try {
    await rm(path.join(musicDir, removed.filename), { force: true });
  } catch {
    // file may already be gone
  }

  return NextResponse.json({ success: true, removed: { id } });
}
