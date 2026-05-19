import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Brand presets are stored client-side in localStorage. Use the UI to manage them.",
  });
}
