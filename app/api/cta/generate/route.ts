import { NextResponse } from "next/server";
import { z } from "zod";
import { mimo } from "@/app/lib/mimo";
import { getToneVoiceStyle } from "@/app/lib/tones/tone-presets";

export const runtime = "nodejs";

const CTAGenerateSchema = z.object({
  transcript: z.string().max(500).optional(),
  platform: z.string().min(2).max(30),
  language: z.string().max(10).optional(),
  tone: z.string().max(30).optional(),
  ctaType: z
    .enum([
      "save",
      "comment",
      "follow",
      "share",
      "rage",
      "curiosity",
      "soft",
      "aggressive",
      "auto",
    ])
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

  const parsed = CTAGenerateSchema.safeParse(body);

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

  const { transcript, platform, language, tone, ctaType } = parsed.data;

  const lang = language && language !== "auto" ? language : "Indonesian";
  const voiceStyle = tone ? getToneVoiceStyle(tone) : "";
  const typeInstruction =
    ctaType && ctaType !== "auto"
      ? `CTA type: ${ctaType}.`
      : "Choose the best CTA type for this content.";

  try {
    const completion = await mimo.chat.completions.create({
      model: process.env.MIMO_MODEL || "mimo-v2.5-pro",
      messages: [
        {
          role: "system",
          content:
            "You are a social media engagement specialist. " +
            "Generate short, punchy calls-to-action (CTA) for short-form video content. " +
            "The CTA should match the content's tone and drive engagement. " +
            "Return only a JSON object with a single 'cta' field." +
            (voiceStyle
              ? `\nWrite in this voice style: ${voiceStyle}`
              : ""),
        },
        {
          role: "user",
          content: `Content context: ${transcript ? transcript.slice(0, 200) : "Short-form video clip"}
Platform: ${platform}
Language: ${lang}
${typeInstruction}

Generate one CTA (max 15 words, in ${lang}):
{ "cta": "string" }`,
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
      cta: String(result.cta || "").slice(0, 100),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI error";

    console.error("CTA generate error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate CTA",
        detail: message,
      },
      { status: 500 }
    );
  }
}
