import path from "node:path";
import { stat } from "node:fs/promises";
import {
  footageDir,
  outputsDir,
  projectRoot,
  sourceVideoExtensions,
} from "./assets";

export async function resolveSourceVideoPath(sourcePath: string | undefined) {
  if (!sourcePath || sourcePath.includes("\0")) {
    return null;
  }

  const normalized = sourcePath.replace(/\\/g, "/").trim();
  if (
    normalized.includes("../") ||
    normalized.startsWith("../") ||
    normalized === ".."
  ) {
    return null;
  }

  const allowedRoots = [footageDir, outputsDir].map((directory) =>
    path.resolve(directory)
  );
  const candidate = path.isAbsolute(normalized)
    ? path.resolve(normalized)
    : path.resolve(projectRoot, normalized);
  const isAllowed = allowedRoots.some(
    (root) => candidate === root || candidate.startsWith(root + path.sep)
  );

  if (
    !isAllowed ||
    !sourceVideoExtensions.has(path.extname(candidate).toLowerCase())
  ) {
    return null;
  }

  try {
    const file = await stat(candidate);
    return file.isFile() ? candidate : null;
  } catch {
    return null;
  }
}

