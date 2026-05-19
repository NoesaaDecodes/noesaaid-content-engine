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
import { mimo } from "@/app/lib/mimo";
import { getToneVoiceStyle } from "@/app/lib/tones/tone-presets";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 120;

const GenerateClipsSchema = z.object({
  sourcePath: z.string().trim().min(1).max(500),
  platform: z.enum(["reels", "tiktok", "shorts", "generic"]).default("reels"),
  maxClips: z.number().int().min(1).max(10).default(3),
  targetDuration: z.number().min(8).max(90).optional(),
  templateId: z.string().max(120).optional(),
  customWidth: z.number().int().min(256).max(3840).optional(),
  customHeight: z.number().int().min(256).max(3840).optional(),
  language: z.enum(["auto", "id", "en"]).default("auto"),
  tone: z.string().max(30).optional(),
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
  thumbnailUrl: string | null;
  score: number;
  reason: string;
  hook: string;
  title: string;
  caption: string;
  hashtags: string[];
  startTime: number;
  endTime: number;
  words?: Array<{ word: string; start: number; end: number }>;
  aiScript?: { hook: string; caption: string; hashtags: string[] };
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

    const batchSize = 3;
    const clips: GeneratedClip[] = [];

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((candidate) =>
          renderCandidate(
            resolvedPath,
            candidate,
            settings,
            input.data.customWidth,
            input.data.customHeight,
            words,
            input.data.platform,
            input.data.language,
            input.data.tone
          )
        )
      );
      clips.push(...results);
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
  customWidth: number | undefined,
  customHeight: number | undefined,
  words: Array<{ word: string; start: number; end: number }> | undefined,
  platform: string,
  language: string,
  tone?: string
): Promise<GeneratedClip> {
  try {
    const [output, aiScript] = await Promise.all([
      renderClip({
        sourcePath: resolvedPath,
        candidate,
        settings,
        customWidth,
        customHeight,
        words,
      }),
      generateAIScript(candidate, words, platform, language, tone),
    ]);

    const thumbPath = output.outputPath.replace(".mp4", "-thumb.jpg");
    const thumbnailUrl = output.downloadUrl.replace(".mp4", "-thumb.jpg");

    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-ss", "1",
        "-i", output.outputPath,
        "-frames:v", "1",
        "-update", "1",
        thumbPath,
      ], { timeout: 15_000 });
    } catch (thumbErr) {
      console.error("Thumbnail extraction failed:", thumbErr);
    }

    return {
      filename: output.filename,
      downloadUrl: output.downloadUrl,
      previewUrl: output.downloadUrl,
      thumbnailUrl,
      score: candidate.score,
      reason: candidate.reason,
      hook: candidate.suggestedHook,
      title: candidate.title,
      caption: candidate.suggestedCaption,
      hashtags: candidate.suggestedHashtags,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      words: words || [],
      aiScript,
    };
  } catch (error) {
    return {
      filename: null,
      downloadUrl: null,
      previewUrl: null,
      thumbnailUrl: null,
      score: candidate.score,
      reason: candidate.reason,
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

async function generateAIScript(
  candidate: ClipCandidate,
  words: Array<{ word: string; start: number; end: number }> | undefined,
  platform: string,
  language: string,
  tone?: string
): Promise<{ hook: string; caption: string; hashtags: string[] } | undefined> {
  try {
    const clipWords = (words || []).filter(
      (w) => w.end > candidate.startTime && w.start < candidate.endTime
    );
    const transcript =
      clipWords.length > 0
        ? clipWords.map((w) => w.word).join(" ")
        : candidate.suggestedCaption || candidate.title;

    const voiceStyle = tone ? getToneVoiceStyle(tone) : "";

    const completion = await mimo.chat.completions.create({
      model: process.env.MIMO_MODEL || "mimo-v2.5-pro",
      messages: [
        {
          role: "system",
          content:
            "You are a viral content copywriter. Generate engaging social media copy for a short video clip. Return ONLY valid JSON." +
            (voiceStyle
              ? `\nWrite in this voice style: ${voiceStyle}`
              : ""),
        },
        {
          role: "user",
          content: `Clip: ${candidate.title}
Platform: ${platform}
Duration: ${Math.round(candidate.duration)}s
${language !== "auto" ? `Language: ${language}` : ""}
Transcript: "${transcript}"

Return JSON:
{
  "hook": "string (max 80 chars, attention-grabbing opening line)",
  "caption": "string (max 300 chars, engaging caption)",
  "hashtags": ["string", "string", "string", "string", "string"] (5-7 relevant tags without #)
}`,
        },
      ],
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return undefined;

    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);

    return {
      hook: String(result.hook || "").slice(0, 120),
      caption: String(result.caption || "").slice(0, 400),
      hashtags: Array.isArray(result.hashtags)
        ? result.hashtags.map((t: unknown) => String(t)).slice(0, 10)
        : [],
    };
  } catch (err) {
    console.error("AI script generation failed:", err);
    return undefined;
  }
}

type TranscriptionWord = { word: string; start: number; end: number };

async function transcribeSource(
  resolvedPath: string,
  language: string
): Promise<TranscriptionWord[]> {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "transcribe.py");
    const args = [scriptPath, resolvedPath, "--model", "base"];
    if (language !== "auto") {
      args.push("--language", language);
    }
    console.log("[STT] timeout set to 240s");
    const { stdout } = await execFileAsync("python", args, {
      timeout: 240_000,
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
