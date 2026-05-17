import { NextResponse } from "next/server";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { analyzeSourceVideo, type ClipCandidate } from "@/app/lib/clips";
import { renderClip } from "@/app/lib/ffmpeg/clipper";
import { resolveSourceVideoPath } from "@/app/lib/ffmpeg/source-video";
import {
  normalizeRenderSettings,
  type RenderSettings,
} from "@/app/lib/render-settings";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 120;

const GenerateClipsSchema = z.object({
  sourcePath: z.string().trim().min(1).max(500),
  platform: z.enum(["reels", "tiktok", "shorts", "generic"]).default("reels"),
  maxClips: z.number().int().min(1).max(5).default(3),
  targetDuration: z.number().min(8).max(90).optional(),
  templateId: z.string().max(120).optional(),
  customWidth: z.number().int().min(256).max(3840).optional(),
  customHeight: z.number().int().min(256).max(3840).optional(),
  language: z.enum(["auto", "id", "en"]).default("auto"),
  settings: z
    .object({
      quality: z.string().optional(),
    })
    .optional(),
});

type GeneratedClip = {
  filename: string | null;
  downloadUrl: string | null;
  previewUrl: string | null;
  score: number;
  hook: string;
  title: string;
  caption: string;
  hashtags: string[];
  startTime: number;
  endTime: number;
  words?: Array<{ word: string; start: number; end: number }>;
  error?: string;
};

export async function POST(request: Request) {
  const input = await parseGenerateRequest(request);

  if (!input.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid viral clip request",
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

    const maxClips = Math.min(input.data.maxClips || 3, 5);
    const settings = normalizeRenderSettings(input.data.settings || {});
    const words = await transcribeSource(resolvedPath, input.data.language);
    const analysis = await analyzeSourceVideo(
      {
        sourcePath: input.data.sourcePath,
        resolvedPath,
      },
      {
        platform: input.data.platform,
        maxClips,
        targetDuration: input.data.targetDuration,
        templateId: input.data.templateId,
      },
      words
    );
    const candidates = analysis.candidates
      .slice()
      .sort((left, right) => right.score - left.score)
      .slice(0, maxClips);
    const clips: GeneratedClip[] = [];

    for (const candidate of candidates) {
      clips.push(
        await renderCandidate(
          resolvedPath,
          candidate,
          settings,
          input.data.customWidth,
          input.data.customHeight,
          words
        )
      );
    }

    return NextResponse.json({
      success: true,
      source: analysis.source,
      metadata: analysis.metadata,
      clips,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown viral clip error";

    console.error("Generate viral clips error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate viral clips",
        detail: message,
      },
      { status: 500 }
    );
  }
}

async function renderCandidate(
  resolvedPath: string,
  candidate: ClipCandidate,
  settings: RenderSettings,
  customWidth?: number,
  customHeight?: number,
  words?: Array<{ word: string; start: number; end: number }>
): Promise<GeneratedClip> {
  try {
    const output = await renderClip({
      sourcePath: resolvedPath,
      candidate,
      settings,
      customWidth,
      customHeight,
      words,
    });

    return {
      filename: output.filename,
      downloadUrl: output.downloadUrl,
      previewUrl: output.downloadUrl,
      score: candidate.score,
      hook: candidate.suggestedHook,
      title: candidate.title,
      caption: candidate.suggestedCaption,
      hashtags: candidate.suggestedHashtags,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      words: words || [],
    };
  } catch (error) {
    return {
      filename: null,
      downloadUrl: null,
      previewUrl: null,
      score: candidate.score,
      hook: candidate.suggestedHook,
      title: candidate.title,
      caption: candidate.suggestedCaption,
      hashtags: candidate.suggestedHashtags,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      error: error instanceof Error ? error.message : "Clip render failed.",
    };
  }
}

type TranscriptionWord = { word: string; start: number; end: number };

async function transcribeSource(
  resolvedPath: string,
  language: string
): Promise<TranscriptionWord[]> {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "transcribe.py");
    const args = [scriptPath, resolvedPath, "--model", "small"];
    if (language !== "auto") {
      args.push("--language", language);
    }
    const { stdout } = await execFileAsync("python", args, {
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    const result = JSON.parse(stdout);
    if (result.error) {
      console.error("Transcription error:", result.error);
      return [];
    }
    return (result.words || []).map((w: { word: string; start: number; end: number }) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));
  } catch (error) {
    console.error("Transcription failed, falling back to static captions:", error);
    return [];
  }
}

async function parseGenerateRequest(request: Request) {
  try {
    const body = await request.json();
    const parsed = GenerateClipsSchema.safeParse(body);

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
