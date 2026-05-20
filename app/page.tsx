"use client";

import { useState } from "react";
import { ViralClipStudio } from "@/app/components/viral-clip-studio";
import { ScriptStudio } from "@/app/components/script-studio";

export default function Home() {
  const [mode, setMode] = useState<"clips" | "script">("clips");

  if (mode === "script") {
    return (
      <main className="flex min-h-screen items-start justify-center bg-[#0a0a0a]">
        <ScriptStudio onBack={() => setMode("clips")} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <ViralClipStudio />
    </main>
  );
}
