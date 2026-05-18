import path from "node:path";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { ensureRenderDirectories, musicDir } from "@/app/lib/ffmpeg/assets";
import {
  addTrackToCatalog,
  getCatalog,
  isSafeMusicFilename,
  type MusicTrack,
} from "@/app/lib/music/music-engine";

export const runtime = "nodejs";

const maxUploadBytes = 20 * 1024 * 1024;
const allowedExtensions = new Set([".mp3", ".wav", ".m4a", ".aac"]);

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid upload request",
        detail: "Request must be multipart form data.",
      },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: "No file uploaded",
        detail: "Attach a music file using the file field.",
      },
      { status: 400 }
    );
  }

  const originalName = file.name || "track.mp3";
  const extension = path.extname(originalName).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unsupported format",
        detail: "Accepted formats: mp3, wav, m4a, aac.",
      },
      { status: 400 }
    );
  }

  if (!isSafeMusicFilename(originalName)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unsafe filename",
        detail: "Filename contains invalid characters.",
      },
      { status: 400 }
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      { success: false, error: "Empty file." },
      { status: 400 }
    );
  }

  if (file.size > maxUploadBytes) {
    return NextResponse.json(
      {
        success: false,
        error: "File too large",
        detail: "Maximum upload size is 20 MB.",
      },
      { status: 413 }
    );
  }

  await ensureRenderDirectories();

  const safeBase = path
    .basename(originalName, extension)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "track";
  const uid = randomUUID().replace(/-/g, "").slice(0, 8);
  const filename = `user-${safeBase}-${uid}${extension}`;
  const outputPath = path.join(musicDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(outputPath, buffer);

  const existingCatalog = await getCatalog();
  const existingTrack = existingCatalog.find((t) => t.filename === filename);

  if (existingTrack) {
    return NextResponse.json({ success: true, track: existingTrack });
  }

  const track: MusicTrack = {
    id: `user-${uid}`,
    title: path.basename(originalName, extension),
    category: "upbeat",
    filename,
    source: "user",
    duration: 0,
    bpm: 0,
    downloaded: true,
  };

  await addTrackToCatalog(track);

  return NextResponse.json({ success: true, track });
}
