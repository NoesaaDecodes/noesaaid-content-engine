import path from "node:path";
import { readFile, stat, writeFile } from "node:fs/promises";
import { musicDir } from "@/app/lib/ffmpeg/assets";

export type MusicTrack = {
  id: string;
  title: string;
  category: "upbeat" | "lofi" | "cinematic" | "funny";
  filename: string;
  source: "mixkit" | "user";
  duration: number;
  bpm: number;
  downloaded: boolean;
};

const catalogPath = path.join(musicDir, "catalog.json");

export async function getCatalog(): Promise<MusicTrack[]> {
  try {
    const raw = await readFile(catalogPath, "utf-8");
    const tracks = JSON.parse(raw) as MusicTrack[];

    // Deduplicate: keep first entry per filename
    const seen = new Set<string>();
    const unique = tracks.filter((t) => {
      if (seen.has(t.filename)) return false;
      seen.add(t.filename);
      return true;
    });

    // Write back deduplicated catalog if duplicates were found
    if (unique.length !== tracks.length) {
      await writeFile(catalogPath, JSON.stringify(unique, null, 2), "utf-8");
    }

    return Promise.all(
      unique.map(async (track) => ({
        ...track,
        downloaded: await isDownloaded(track.filename),
      }))
    );
  } catch {
    return [];
  }
}

export async function getTracksByCategory(
  category: MusicTrack["category"]
): Promise<MusicTrack[]> {
  const catalog = await getCatalog();
  return catalog.filter((t) => t.category === category);
}

export async function isDownloaded(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(musicDir, filename);
    const file = await stat(filePath);
    return file.isFile();
  } catch {
    return false;
  }
}

export function getTrackPath(filename: string): string {
  return path.join(musicDir, filename);
}

export async function addTrackToCatalog(
  track: MusicTrack
): Promise<void> {
  const catalog = await getCatalog();
  catalog.push(track);
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2), "utf-8");
}

export async function removeTrackFromCatalog(
  id: string
): Promise<MusicTrack | null> {
  const catalog = await getCatalog();
  const index = catalog.findIndex((t) => t.id === id);

  if (index === -1) return null;

  const [removed] = catalog.splice(index, 1);
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2), "utf-8");
  return removed;
}

export function isSafeMusicFilename(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return (
    [".mp3", ".wav", ".m4a", ".aac"].includes(ext) &&
    /^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,180}$/.test(filename) &&
    !filename.includes("..") &&
    !filename.includes("/") &&
    !filename.includes("\\")
  );
}
