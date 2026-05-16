import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeSourceVideo } from "@/app/lib/clips";
import { resolveSourceVideoPath } from "@/app/lib/ffmpeg/source-video";

export const runtime = "nodejs";
export const maxDuration = 120;

const AnalyzeClipsSchema = z.object({
  sourcePath: z.string().trim().min(1).max(500),
  platform: z
    .enum(["reels", "tiktok", "shorts", "generic"])
    .default("generic"),
  maxClips: z.number().int().min(1).max(8).default(3),
  targetDuration: z.number().min(8).max(90).optional(),
});

export async function POST(request: Request) {
  const input = await parseAnalyzeRequest(request);

  if (!input.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid clip analysis request",
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

    const result = await analyzeSourceVideo(
      {
        sourcePath: input.data.sourcePath,
        resolvedPath,
      },
      {
        platform: input.data.platform,
        maxClips: input.data.maxClips,
        targetDuration: input.data.targetDuration,
      }
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown clip analysis error";

    console.error("Analyze clips error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze source video",
        detail: message,
      },
      { status: 500 }
    );
  }
}

async function parseAnalyzeRequest(request: Request) {
  try {
    const body = await request.json();
    const parsed = AnalyzeClipsSchema.safeParse(body);

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
