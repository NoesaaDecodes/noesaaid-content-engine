import { NextResponse } from "next/server";
import { getCatalog } from "@/app/lib/music/music-engine";

export const runtime = "nodejs";

export async function GET() {
  try {
    const catalog = await getCatalog();
    return NextResponse.json({ success: true, catalog });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load music catalog";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
