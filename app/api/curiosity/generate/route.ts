import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { getCuriosityPatterns } from "@/app/lib/curiosity/curiosity-engine";

export const runtime = "nodejs";

const mimo = new OpenAI({
  apiKey: process.env.MIMO_API_KEY || "",
  baseURL: process.env.MIMO_BASE_URL || "https://token-plan-sgp.xiaomimimo.com/v1",
});

const Schema = z.object({
  transcript: z.string().min(1).max(2000),
  language: z.enum(["auto", "id", "en"]).default("auto"),
  tone: z.string().max(50).optional(),
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

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request", detail: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { transcript, language, tone } = parsed.data;
  const lang = language === "auto" ? "en" : language;
  const fallback = getCuriosityPatterns(lang);

  try {
    const completion = await mimo.chat.completions.create({
      model: process.env.MIMO_MODEL || "mimo-v2.5-pro",
      messages: [
        {
          role: "system",
          content: `You are a viral content strategist specializing in curiosity hooks. Generate 4 curiosity elements for a video clip. Return ONLY valid JSON.${tone ? `\nTone: ${tone}` : ""}`,
        },
        {
          role: "user",
          content: `Transcript: "${transcript.slice(0, 500)}"
Language: ${lang}

Generate curiosity hooks:
{
  "openLoop": "unfinished thought that makes viewer stay (max 60 chars)",
  "delayedPayoff": "hint at reveal later (max 60 chars)",
  "mysteryPhrase": "vague but intriguing statement (max 60 chars)",
  "tensionLine": "conflict or stakes (max 60 chars)"
}`,
        },
      ],
      temperature: 0.9,
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty AI response");

    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json({
      success: true,
      openLoop: String(result.openLoop || fallback.openLoop).slice(0, 80),
      delayedPayoff: String(result.delayedPayoff || fallback.delayedPayoff).slice(0, 80),
      mysteryPhrase: String(result.mysteryPhrase || fallback.mysteryPhrase).slice(0, 80),
      tensionLine: String(result.tensionLine || fallback.tensionLine).slice(0, 80),
    });
  } catch {
    return NextResponse.json({
      success: true,
      ...fallback,
    });
  }
}
