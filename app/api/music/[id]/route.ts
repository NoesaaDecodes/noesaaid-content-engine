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
  const rawId = (await params).id;
  const id = decodeURIComponent(rawId);
  console.log("[DELETE] raw:", rawId, "decoded:", id);

  if (!id || id.length > 120) {
    return NextResponse.json(
      { success: false, error: "Invalid track ID." },
      { status: 400 }
    );
  }

  const removed = await removeTrackFromCatalog(id);
  console.log("[DELETE] removeTrackFromCatalog result:", removed ? { id: removed.id, filename: removed.filename, source: removed.source } : null);

  if (!removed) {
    return NextResponse.json(
      { success: false, error: "Track not found.", detail: `No track matching id: ${id}` },
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
