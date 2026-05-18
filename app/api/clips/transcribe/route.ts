import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSourceVideoPath } from "@/app/lib/ffmpeg/source-video";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 120;

const TranscribeSchema = z.object({
  sourcePath: z.string().trim().min(1).max(500),
  model: z.enum(["tiny", "base", "small", "medium", "large"]).default("small"),
  language: z.string().min(2).max(5).optional(),
});

export async function POST(request: Request) {
  const input = await parseTranscribeRequest(request);

  if (!input.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid transcribe request",
        detail: input.detail,
      },
      { status: 400 }
    );
  }

  try {
    const resolvedPath = await resolveSourceVideoPath(input.data.sourcePath);

    if (!resolvedPath) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid source video",
          detail:
            "Use a safe local video under assets/footage/ or outputs/ with an allowed extension.",
        },
        { status: 400 }
      );
    }

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "transcribe.py"
    );

    const args = [scriptPath, resolvedPath, "--model", input.data.model];
    if (input.data.language) {
      args.push("--language", input.data.language);
    }

    const { stdout, stderr } = await execFileAsync("python", args, {
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr) {
      console.error("Transcribe stderr:", stderr);
    }

    const result = JSON.parse(stdout);

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: "Transcription failed",
          detail: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown transcribe error";

    console.error("Transcribe error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to transcribe video",
        detail: message,
      },
      { status: 500 }
    );
  }
}

async function parseTranscribeRequest(request: Request) {
  try {
    const body = await request.json();
    const parsed = TranscribeSchema.safeParse(body);

    if (!parsed.success) {
      return {
        success: false as const,
        detail: parsed.error.issues[0]?.message || "Request body is invalid.",
      };
    }

    return {
      success: true as const,
      data: parsed.data,
    };
  } catch {
    return {
      success: false as const,
      detail: "Request body must be valid JSON.",
    };
  }
}
