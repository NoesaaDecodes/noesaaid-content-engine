import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, readdir } from "node:fs/promises";

export const projectRoot = process.cwd();
export const assetsRoot = path.join(projectRoot, "assets");
export const footageDir = path.join(assetsRoot, "footage");
export const footageUploadsDir = path.join(footageDir, "uploads");
export const musicDir = path.join(assetsRoot, "music");
export const outputsDir = path.join(projectRoot, "outputs");
export const renderTempDir = path.join(projectRoot, ".next", "render-tmp");

const footageExtensions = new Set([".mp4", ".mov", ".mkv", ".webm"]);
const musicExtensions = new Set([".mp3", ".wav", ".m4a", ".aac"]);
export const sourceVideoExtensions = new Set([".mp4", ".mov", ".mkv", ".webm"]);

export type AssetFile = {
  name: string;
  path: string;
  type: string;
};

export async function ensureRenderDirectories() {
  await Promise.all([
    mkdir(footageDir, { recursive: true }),
    mkdir(footageUploadsDir, { recursive: true }),
    mkdir(musicDir, { recursive: true }),
    mkdir(outputsDir, { recursive: true }),
    mkdir(renderTempDir, { recursive: true }),
  ]);
}

export async function findFirstFootage() {
  return findFirstAssetPath(footageDir, footageExtensions);
}

export async function findFirstMusic() {
  return findFirstAssetPath(musicDir, musicExtensions);
}

export async function listAssets() {
  await ensureRenderDirectories();

  const [footage, music] = await Promise.all([
    listAssetFiles(footageDir, "footage", footageExtensions),
    listAssetFiles(musicDir, "music", musicExtensions),
  ]);

  return { footage, music };
}

export async function resolveFootageFile(filename: string | undefined) {
  return resolveAssetFile(filename, footageDir, footageExtensions);
}

export async function resolveMusicFile(filename: string | undefined) {
  return resolveAssetFile(filename, musicDir, musicExtensions);
}

async function findFirstAssetPath(directory: string, extensions: Set<string>) {
  const asset = (await listAssetFiles(directory, "", extensions))[0];
  return asset ? path.join(directory, asset.name) : null;
}

async function listAssetFiles(
  directory: string,
  type: "footage" | "music" | "",
  extensions: Set<string>
) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort()
      .filter((name) => isSafeAssetFilename(name, extensions))
      .map((name) => ({
        name,
        path: type ? `assets/${type}/${name}` : name,
        type: path.extname(name).toLowerCase().slice(1),
      }));
  } catch {
    return [];
  }
}

async function resolveAssetFile(
  filename: string | undefined,
  directory: string,
  extensions: Set<string>
) {
  if (!filename || !isSafeAssetFilename(filename, extensions)) {
    return null;
  }

  const assets = await listAssetFiles(directory, "", extensions);
  const match = assets.find((asset) => asset.name === filename);

  return match ? path.join(directory, match.name) : null;
}

function isSafeAssetFilename(filename: string, extensions: Set<string>) {
  const extension = path.extname(filename).toLowerCase();

  return (
    /^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,180}$/.test(filename) &&
    !filename.includes("..") &&
    !filename.includes("/") &&
    !filename.includes("\\") &&
    extensions.has(extension)
  );
}

export function createOutputPath() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const filename = `ai-reel-${stamp}-${suffix}.mp4`;

  return {
    filename,
    outputPath: path.join(outputsDir, filename),
    publicPath: path.join("outputs", filename).replace(/\\/g, "/"),
    downloadUrl: `/api/render-reel/file/${filename}`,
  };
}

export function createClipOutputPath() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const filename = `ai-clip-${stamp}-${suffix}.mp4`;

  return {
    filename,
    outputPath: path.join(outputsDir, filename),
    publicPath: path.join("outputs", filename).replace(/\\/g, "/"),
    downloadUrl: `/api/render-reel/file/${filename}`,
  };
}
