import { NextResponse } from "next/server";
import { listAssets } from "@/app/lib/ffmpeg/assets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const assets = await listAssets();

    return NextResponse.json(assets);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown asset error";

    console.error("List assets error:", error);

    return NextResponse.json(
      {
        error: "Failed to list assets",
        detail: message,
      },
      { status: 500 }
    );
  }
}
