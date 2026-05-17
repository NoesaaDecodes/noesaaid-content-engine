"use client";

import dynamic from "next/dynamic";

const StudioClient = dynamic(() => import("./studio-client"), { ssr: false });

export default function StudioPage() {
  return <StudioClient />;
}
