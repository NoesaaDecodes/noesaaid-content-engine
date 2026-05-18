import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { outputsDir } from "@/app/lib/ffmpeg/assets";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!/^ai-(?:reel|clip)-\d{8}T\d{6}Z-[a-f0-9]{8}\.(?:mp4|jpg)$/.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = path.join(outputsDir, filename);
  const resolved = path.resolve(filePath);
  const outputRoot = path.resolve(outputsDir);

  if (!resolved.startsWith(outputRoot + path.sep)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const isJpg = filename.endsWith(".jpg");
  const contentType = isJpg ? "image/jpeg" : "video/mp4";

  try {
    const file = await readFile(resolved);

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
