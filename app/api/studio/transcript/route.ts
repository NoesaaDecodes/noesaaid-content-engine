import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 60;

type TranscriptWord = { word: string; start: number; end: number };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sourcePath = url.searchParams.get("sourcePath");
  const startTime = parseFloat(url.searchParams.get("startTime") || "0");
  const duration = parseFloat(url.searchParams.get("duration") || "0");

  if (!sourcePath || !Number.isFinite(startTime) || !Number.isFinite(duration) || duration <= 0) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid sourcePath, startTime, or duration" },
      { status: 400 }
    );
  }

  try {
    // Cache key: hash of source + start + duration
    const sourceHash = createHash("sha256").update(sourcePath).digest("hex").slice(0, 8);
    const startRounded = Math.round(startTime * 10) / 10;
    const durationRounded = Math.round(duration * 10) / 10;
    const cacheKey = `${sourceHash}-${startRounded}-${durationRounded}`;
    const cacheDir = path.join(process.cwd(), "outputs", "transcripts");
    const cacheFile = path.join(cacheDir, `${cacheKey}.json`);

    // Check cache
    try {
      const cached = await fs.readFile(cacheFile, "utf-8");
      const words = JSON.parse(cached) as TranscriptWord[];
      console.log("[STT-CACHE] hit:", cacheKey, words.length, "words");
      return NextResponse.json({ success: true, words, cached: true });
    } catch {
      // Not cached — proceed with STT
    }

    // Extract audio segment
    const tempDir = path.join(process.cwd(), "outputs", "temp");
    const tempFile = path.join(tempDir, `${cacheKey}.wav`);
    await fs.mkdir(tempDir, { recursive: true });

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-ss", startTime.toString(),
        "-t", duration.toString(),
        "-i", sourcePath,
        "-ar", "16000",
        "-ac", "1",
        "-vn",
        tempFile,
      ],
      { timeout: 15_000 }
    );

    // Run STT
    const scriptPath = path.join(process.cwd(), "scripts", "transcribe.py");
    const { stdout } = await execFileAsync("python", [scriptPath, tempFile, "--model", "tiny"], {
      timeout: 30_000,
      maxBuffer: 5 * 1024 * 1024,
    });

    // Clean up temp file
    fs.unlink(tempFile).catch(() => {});

    const result = JSON.parse(stdout);
    if (result.error) {
      console.log("[STT] error:", result.error);
      return NextResponse.json({ success: true, words: [], cached: false });
    }

    // Offset words by startTime (STT returns relative timestamps)
    const words: TranscriptWord[] = (result.words || []).map(
      (w: { word: string; start: number; end: number }) => ({
        word: w.word,
        start: w.start + startTime,
        end: w.end + startTime,
      })
    );

    // Save to cache
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cacheFile, JSON.stringify(words), "utf-8");
    console.log("[STT] done:", cacheKey, words.length, "words — cached");

    return NextResponse.json({ success: true, words, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "STT failed";
    console.error("[STT] transcript route error:", message);
    return NextResponse.json({ success: false, error: message, words: [] }, { status: 500 });
  }
}
