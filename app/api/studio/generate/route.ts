import { NextResponse } from "next/server";
import { z } from "zod";
import { mimo } from "@/app/lib/mimo";

export const runtime = "nodejs";

const StudioGenerateSchema = z.object({
  clipTitle: z.string().min(1).max(200),
  platform: z.string().min(2).max(30),
  duration: z.number().min(1).max(300).optional(),
  language: z.string().max(10).optional(),
  words: z
    .array(
      z.object({
        word: z.string(),
        start: z.number(),
        end: z.number(),
      })
    )
    .optional(),
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

  const parsed = StudioGenerateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
        detail: parsed.error.issues[0]?.message || "Request body is invalid.",
      },
      { status: 400 }
    );
  }

  const { clipTitle, platform, duration, language, words } = parsed.data;

  const transcript =
    words && words.length > 0
      ? words.map((w) => w.word).join(" ")
      : "";

  try {
    const completion = await mimo.chat.completions.create({
      model: process.env.MIMO_MODEL || "mimo-v2.5-pro",
      messages: [
        {
          role: "system",
          content:
            "You are a short-form video copywriter. Generate engaging social media copy for a video clip. Base your copy on the actual spoken content when a transcript is provided. Do NOT add brand names or unrelated context. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content: `Video clip: ${clipTitle}
Platform: ${platform}
${duration ? `Duration: ${duration}s` : ""}
${language && language !== "auto" ? `Language: ${language}` : ""}
${transcript ? `\nTranscript of spoken words:\n"${transcript}"` : ""}

Return JSON:
{
  "hook": "string (max 80 chars, attention-grabbing)",
  "caption": "string (max 300 chars, engaging)",
  "hashtags": ["string", "string", "string", "string", "string"] (5-7 relevant tags without #)
}`,
        },
      ],
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      throw new Error("Empty AI response");
    }

    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(cleaned);

    return NextResponse.json({
      success: true,
      result: {
        hook: String(result.hook || "").slice(0, 120),
        caption: String(result.caption || "").slice(0, 400),
        hashtags: Array.isArray(result.hashtags)
          ? result.hashtags.map((t: unknown) => String(t)).slice(0, 10)
          : [],
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI error";

    console.error("Studio generate error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate script",
        detail: message,
      },
      { status: 500 }
    );
  }
}
