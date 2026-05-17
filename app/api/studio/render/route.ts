import { NextResponse } from "next/server";
import { z } from "zod";
import { renderClip } from "@/app/lib/ffmpeg/clipper";
import { resolveSourceVideoPath } from "@/app/lib/ffmpeg/source-video";
import { resolveMusicFile } from "@/app/lib/ffmpeg/assets";
import {
  normalizeRenderSettings,
  captionStyleIds,
  type CaptionStyleParams,
} from "@/app/lib/render-settings";

export const runtime = "nodejs";
export const maxDuration = 120;

function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

const StudioRenderSchema = z.object({
  sourcePath: z.string().trim().min(1).max(500),
  candidate: ClipCandidateSchema,
  captionStyle: z.enum(captionStyleIds).default("classic"),
  captionStyleParams: z
    .object({
      fontColor: z.enum(["#FFE600", "#FFFFFF", "#00FFFF"]),
      fontSize: z.enum(["small", "medium", "large"]),
      background: z.enum(["dark", "light", "none"]),
      position: z.enum(["top", "center", "bottom"]),
      hookPosition: z.enum(["top", "center", "bottom"]).optional(),
    })
    .optional(),
  customWidth: z.number().int().min(256).max(3840).optional(),
  customHeight: z.number().int().min(256).max(3840).optional(),
  hook: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  musicPath: z.string().max(200).optional(),
  musicVolume: z.number().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = StudioRenderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid studio render request",
        detail: parsed.error.issues[0]?.message || "Request body is invalid.",
      },
      { status: 400 }
    );
  }

  try {
    const resolvedPath = await resolveSourceVideoPath(parsed.data.sourcePath);

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

    const {
      candidate,
      captionStyle,
      captionStyleParams,
      customWidth,
      customHeight,
      hook,
      caption,
    } = parsed.data;

    const duration = candidate.endTime - candidate.startTime;

    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 90 ||
      Math.abs(duration - candidate.duration) > 0.25
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

    let resolvedMusic: string | undefined;
    if (parsed.data.musicPath) {
      const musicFile = await resolveMusicFile(parsed.data.musicPath);
      if (musicFile) {
        resolvedMusic = musicFile;
      }
    }

    const output = await renderClip({
      sourcePath: resolvedPath,
      candidate,
      settings: normalizeRenderSettings({}),
      customWidth,
      customHeight,
      captionStyle,
      captionStyleParams: captionStyleParams as CaptionStyleParams | undefined,
      staticHook: hook ? stripEmoji(hook) : undefined,
      staticCaption: caption ? stripEmoji(caption) : undefined,
      musicPath: resolvedMusic,
      musicVolume: parsed.data.musicVolume,
    });

    return NextResponse.json({
      success: true,
      output: {
        filename: output.filename,
        downloadUrl: output.downloadUrl,
        duration: output.duration,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown studio render error";

    console.error("Studio render error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to render clip", detail: message },
      { status: 500 }
    );
  }
}
