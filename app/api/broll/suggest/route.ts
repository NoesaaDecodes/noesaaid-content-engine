import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestBRoll } from "@/app/lib/broll/broll-suggester";

export const runtime = "nodejs";

const Schema = z.object({
  transcript: z.string().min(1).max(5000),
  segments: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        end: z.number(),
      })
    )
    .optional(),
  language: z.enum(["auto", "id", "en"]).default("auto"),
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

  const { transcript, segments } = parsed.data;

  const segs =
    segments && segments.length > 0
      ? segments
      : [{ text: transcript, start: 0, end: 10 }];

  const suggestions = suggestBRoll(segs);

  return NextResponse.json({
    success: true,
    suggestions,
  });
}
