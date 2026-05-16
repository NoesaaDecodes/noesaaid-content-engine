import { rm } from "node:fs/promises";
import ffmpeg from "fluent-ffmpeg";
import {
  createClipOutputPath,
  ensureRenderDirectories,
} from "@/app/lib/ffmpeg/assets";
import { qualityOptions, type RenderSettings } from "@/app/lib/render-settings";
import type { ClipCandidate } from "@/app/lib/clips";

const width = 1080;
const height = 1920;
const fps = 30;

type ClipRenderInput = {
  sourcePath: string;
  candidate: ClipCandidate;
  settings: RenderSettings;
};

export async function renderClip({
  sourcePath,
  candidate,
  settings,
}: ClipRenderInput) {
  await ensureRenderDirectories();

  const { filename, outputPath, publicPath, downloadUrl } = createClipOutputPath();
  const duration = roundTime(candidate.endTime - candidate.startTime);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Invalid clip candidate duration.");
  }

  try {
    await runClipRender({
      sourcePath,
      outputPath,
      startTime: candidate.startTime,
      duration,
      settings,
      filterMode: "crop",
    });
  } catch (error) {
    await rm(outputPath, { force: true });
    await runClipRender({
      sourcePath,
      outputPath,
      startTime: candidate.startTime,
      duration,
      settings,
      filterMode: "pad",
    }).catch(() => {
      throw error;
    });
  }

  return {
    filename,
    outputPath,
    publicPath,
    downloadUrl,
    duration,
    sourceStart: candidate.startTime,
    sourceEnd: candidate.endTime,
  };
}

async function runClipRender({
  sourcePath,
  outputPath,
  startTime,
  duration,
  settings,
  filterMode,
}: {
  sourcePath: string;
  outputPath: string;
  startTime: number;
  duration: number;
  settings: RenderSettings;
  filterMode: "crop" | "pad";
}) {
  const quality = qualityOptions[settings.quality];
  const videoFilter =
    filterMode === "crop"
      ? `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p`
      : `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps},format=yuv420p`;

  await new Promise<void>((resolve, reject) => {
    configureFfmpegPath();

    ffmpeg()
      .input(sourcePath)
      .inputOptions(["-ss", Math.max(0, startTime).toString()])
      .complexFilter([`[0:v]${videoFilter}[vout]`])
      .outputOptions([
        "-map",
        "[vout]",
        "-map",
        "0:a?",
        "-t",
        duration.toString(),
        "-r",
        fps.toString(),
        "-c:v",
        "libx264",
        "-preset",
        quality.preset,
        "-crf",
        quality.crf,
        "-c:a",
        "aac",
        "-b:a",
        quality.audioBitrate,
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
      ])
      .on("end", () => resolve())
      .on("error", (error) => reject(error))
      .save(outputPath);
  });
}

function configureFfmpegPath() {
  if (process.env.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
  }
}

function roundTime(value: number) {
  return Math.round(value * 100) / 100;
}

