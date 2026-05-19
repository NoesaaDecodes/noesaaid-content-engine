import { NextResponse } from "next/server";
import { z } from "zod";
import { mimo } from "@/app/lib/mimo";
import { findSimilarHooks } from "@/app/lib/patterns/pattern-matcher";

export const runtime = "nodejs";

const HookRewriteSchema = z.object({
  originalHook: z.string().min(1).max(200),
  transcript: z.string().max(500).optional(),
  platform: z.string().min(2).max(30),
  language: z.string().max(10).optional(),
  hookType: z
    .enum([
      "contrarian",
      "shock",
      "fear",
      "story",
      "authority",
      "curiosity",
      "urgency",
      "specific",
      "best",
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

  const parsed = HookRewriteSchema.safeParse(body);

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

  const { originalHook, transcript, platform, language, hookType } =
    parsed.data;

  const lang = language && language !== "auto" ? language : "Indonesian";
  const typeInstruction =
    hookType && hookType !== "best"
      ? `Preferred hook type: ${hookType}.`
      : "Choose the best hook type.";

  const similarHooks = findSimilarHooks(
    transcript || originalHook,
    undefined,
    language
  );
  const hookExamples =
    similarHooks.length > 0
      ? `\nReference these proven viral hooks:\n${similarHooks.map((h) => `- "${h.text}"`).join("\n")}`
      : "";

  try {
    const completion = await mimo.chat.completions.create({
      model: process.env.MIMO_MODEL || "mimo-v2.5-pro",
      messages: [
        {
          role: "system",
          content:
            "You are a viral short-form content hook specialist. " +
            "Rewrite weak openings into scroll-stopping hooks. " +
            "Use proven viral patterns. Be specific and punchy. " +
            "Return only JSON.",
        },
        {
          role: "user",
          content: `Original hook: ${originalHook}
${transcript ? `Transcript context: ${transcript.slice(0, 200)}` : ""}
Platform: ${platform}
Language: ${lang}
${typeInstruction}${hookExamples}

Rewrite this hook into 3 alternatives:
{
  "hooks": [
    { "type": "string", "text": "string", "score": number },
    { "type": "string", "text": "string", "score": number },
    { "type": "string", "text": "string", "score": number }
  ]
}
Max 15 words per hook. In ${lang}.`,
        },
      ],
      temperature: 0.9,
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

    const hooks = Array.isArray(result.hooks)
      ? result.hooks.slice(0, 3).map((h: Record<string, unknown>) => ({
          type: String(h.type || "curiosity"),
          text: String(h.text || "").slice(0, 120),
          score: Math.max(0, Math.min(100, Number(h.score) || 70)),
        }))
      : [];

    return NextResponse.json({ success: true, hooks });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI error";

    console.error("Hook rewrite error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to rewrite hook",
        detail: message,
      },
      { status: 500 }
    );
  }
}
