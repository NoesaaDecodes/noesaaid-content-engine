import { NextResponse } from "next/server";
import { z } from "zod";
import { renderReel } from "@/app/lib/ffmpeg/renderer";
import { listAssets } from "@/app/lib/ffmpeg/assets";
import { defaultTemplateId, getTemplateById } from "@/app/lib/templates";
import { normalizeRenderSettings } from "@/app/lib/render-settings";

export const runtime = "nodejs";
export const maxDuration = 120;

const RenderReelSchema = z.object({
  title: z.string().max(160).optional(),
  hook: z.string().max(500).optional(),
  script: z.union([
    z.array(z.string().trim().min(1).max(500)).min(1).max(18),
    z.string().trim().min(1).max(5000),
  ]),
  caption: z.string().max(2200).optional(),
  hashtags: z
    .union([z.array(z.string().max(80)).max(40), z.string().max(1000)])
    .optional(),
  footageFile: z.string().max(220).optional(),
  musicFile: z.string().max(220).optional(),
  templateId: z.string().min(2).default(defaultTemplateId),
  durationMode: z.string().optional(),
  subtitleSize: z.string().optional(),
  quality: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedInput = RenderReelSchema.parse(body);
    const template = getTemplateById(parsedInput.templateId);
    const settings = normalizeRenderSettings(parsedInput);
    const input = {
      ...parsedInput,
      templateId: template.id,
      ...settings,
    };

    if (input.footageFile || input.musicFile) {
      const assets = await listAssets();
      const footageAllowed =
        !input.footageFile ||
        assets.footage.some((asset) => asset.name === input.footageFile);
      const musicAllowed =
        !input.musicFile ||
        assets.music.some((asset) => asset.name === input.musicFile);

      if (!footageAllowed || !musicAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid render asset",
            detail: "Selected footage or music file is not available.",
          },
          { status: 400 }
        );
      }
    }

    const output = await renderReel(input);

    return NextResponse.json({
      success: true,
      output,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown render error";

    console.error("Render reel error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to render reel",
        detail: message,
      },
      { status: 500 }
    );
  }
}
