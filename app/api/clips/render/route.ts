import { NextResponse } from "next/server";
import { z } from "zod";
import { probeVideoDuration } from "@/app/lib/clips";
import { renderClip } from "@/app/lib/ffmpeg/clipper";
import { resolveSourceVideoPath } from "@/app/lib/ffmpeg/source-video";
import { normalizeRenderSettings } from "@/app/lib/render-settings";

export const runtime = "nodejs";
export const maxDuration = 120;

const ClipCandidateSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(180),
  startTime: z.number().min(0),
  endTime: z.number().positive(),
  duration: z.number().positive(),
  score: z.number().min(0).max(100),
  reason: z.string().max(500),
  platform: z.enum(["reels", "tiktok", "shorts", "generic"]),
  suggestedHook: z.string().max(240),
  suggestedCaption: z.string().max(500),
  suggestedHashtags: z.array(z.string().max(80)).max(20),
  visualPlan: z.object({
    aspectMode: z.enum(["vertical", "centerCrop", "fit"]),
    framing: z.enum(["tight", "balanced", "wide"]),
    motionNote: z.string().max(500),
    subtitleNote: z.string().max(500),
  }),
  retentionPlan: z.any().optional(),
});

const RenderClipSchema = z.object({
  sourcePath: z.string().trim().min(1).max(500),
  candidate: ClipCandidateSchema,
  templateId: z.string().max(120).optional(),
  settings: z
    .object({
      durationMode: z.string().optional(),
      subtitleSize: z.string().optional(),
      quality: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const input = await parseRenderRequest(request);

  if (!input.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid clip render request",
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

    const startTime = input.data.candidate.startTime;
    const endTime = input.data.candidate.endTime;
    const duration = endTime - startTime;

    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 90 ||
      Math.abs(duration - input.data.candidate.duration) > 0.25
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid clip candidate",
          detail: "Candidate timing must be positive, bounded, and consistent.",
        },
        { status: 400 }
      );
    }

    const sourceDuration = await probeVideoDuration(resolvedPath);
    if (endTime > sourceDuration + 0.5) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid clip candidate",
          detail: "Candidate end time exceeds the source video duration.",
        },
        { status: 400 }
      );
    }

    const output = await renderClip({
      sourcePath: resolvedPath,
      candidate: input.data.candidate,
      settings: normalizeRenderSettings(input.data.settings || {}),
    });

    return NextResponse.json({
      success: true,
      output,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown clip render error";

    console.error("Render clip error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to render clip",
        detail: message,
      },
      { status: 500 }
    );
  }
}

async function parseRenderRequest(request: Request) {
  try {
    const body = await request.json();
    const parsed = RenderClipSchema.safeParse(body);

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
