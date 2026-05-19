import { NextResponse } from "next/server";
import { findSimilarHooks } from "@/app/lib/patterns/pattern-matcher";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const transcript = url.searchParams.get("transcript") || "";
  const language = url.searchParams.get("language") || "auto";
  const niche = url.searchParams.get("niche") || undefined;

  const hooks = findSimilarHooks(transcript, niche, language);

  return NextResponse.json({
    success: true,
    hooks: hooks.map((h) => ({
      id: h.id,
      text: h.text,
      type: h.type,
      virality: h.virality,
    })),
  });
}
