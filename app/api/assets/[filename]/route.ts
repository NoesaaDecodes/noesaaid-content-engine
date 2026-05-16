import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { footageUploadsDir } from "@/app/lib/ffmpeg/assets";

export const runtime = "nodejs";

const videoExtensions = new Set([".mp4", ".mov", ".mkv", ".webm"]);

function isSafeFilename(filename: string) {
  return (
    /^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,180}$/.test(filename) &&
    !filename.includes("..") &&
    !filename.includes("/") &&
    !filename.includes("\\") &&
    videoExtensions.has(path.extname(filename).toLowerCase())
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename || !isSafeFilename(filename)) {
    return NextResponse.json(
      { success: false, error: "Invalid filename" },
      { status: 400 }
    );
  }

  const filePath = path.join(footageUploadsDir, filename);

  try {
    await unlink(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
