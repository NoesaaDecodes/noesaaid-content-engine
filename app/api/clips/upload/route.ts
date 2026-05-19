import path from "node:path";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { probeVideoDuration } from "@/app/lib/clips";
import {
  ensureRenderDirectories,
  footageUploadsDir,
  sourceVideoExtensions,
} from "@/app/lib/ffmpeg/assets";

export const runtime = "nodejs";
export const maxDuration = 120;

const maxFilesPerUpload = 5;
const maxUploadBytes = 500 * 1024 * 1024;

type UploadSuccess = {
  sourcePath: string;
  filename: string;
  originalName: string;
  duration: number | null;
  size: number;
};

type UploadFailure = {
  filename: string;
  error: string;
};

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

  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No files uploaded",
        detail: "Attach one or more video files using the files field.",
      },
      { status: 400 }
    );
  }

  if (files.length > maxFilesPerUpload) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many files",
        detail: `Upload up to ${maxFilesPerUpload} videos at a time.`,
      },
      { status: 413 }
    );
  }

  await ensureRenderDirectories();

  const uploads: UploadSuccess[] = [];
  const errors: UploadFailure[] = [];

  for (const file of files) {
    const result = await saveUpload(file);
    if ("error" in result) {
      errors.push(result);
    } else {
      uploads.push(result);
    }
  }

  if (uploads.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Upload failed",
        detail: "No valid video files were uploaded.",
        uploads,
        errors,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    uploads,
    errors,
  });
}

async function saveUpload(file: File): Promise<UploadSuccess | UploadFailure> {
  const originalName = file.name || "upload";
  const extension = path.extname(originalName).toLowerCase();

  if (!sourceVideoExtensions.has(extension)) {
    return {
      filename: originalName,
      error: "Unsupported video format.",
    };
  }

  if (originalName.includes("..") || originalName.includes("/") || originalName.includes("\\")) {
    return {
      filename: originalName,
      error: "Unsafe filename.",
    };
  }

  if (file.size <= 0) {
    return {
      filename: originalName,
      error: "Empty file.",
    };
  }

  if (file.size > maxUploadBytes) {
    return {
      filename: originalName,
      error: "File terlalu besar. Maksimal 500MB.",
    };
  }

  const safeBase = path
    .basename(originalName, extension)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "video";
  const filename = `${safeBase}-${randomUUID().replace(/-/g, "").slice(0, 8)}${extension}`;
  const outputPath = path.join(footageUploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(outputPath, buffer);

  let duration: number;
  try {
    duration = Math.round((await probeVideoDuration(outputPath)) * 100) / 100;
  } catch {
    await rm(outputPath, { force: true });
    return {
      filename: originalName,
      error: "Uploaded file could not be read as a valid video.",
    };
  }

  return {
    sourcePath: `assets/footage/uploads/${filename}`,
    filename,
    originalName,
    duration,
    size: file.size,
  };
}
