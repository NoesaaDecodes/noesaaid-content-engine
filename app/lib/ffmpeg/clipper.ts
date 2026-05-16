import ffmpeg from "fluent-ffmpeg";
import {
  createClipOutputPath,
  ensureRenderDirectories,
} from "@/app/lib/ffmpeg/assets";
import { qualityOptions, type RenderSettings } from "@/app/lib/render-settings";
import type { ClipCandidate, ClipPlatformTarget } from "@/app/lib/clips";

const fps = 30;

type Platform = "reels" | "tiktok" | "shorts" | "square" | "landscape";

const PLATFORM_DIMS: Record<Platform, { w: number; h: number }> = {
  reels: { w: 1080, h: 1920 },
  tiktok: { w: 1080, h: 1920 },
  shorts: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
  landscape: { w: 1920, h: 1080 },
};

type ClipRenderInput = {
  sourcePath: string;
  candidate: ClipCandidate;
  settings: RenderSettings;
  platform?: ClipPlatformTarget;
};

export async function renderClip({
  sourcePath,
  candidate,
  settings,
  platform,
}: ClipRenderInput) {
  await ensureRenderDirectories();

  const { filename, outputPath, publicPath, downloadUrl } = createClipOutputPath();
  const duration = roundTime(candidate.endTime - candidate.startTime);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Invalid clip candidate duration.");
  }

  const resolvedPlatform: Platform =
    platform && platform in PLATFORM_DIMS ? (platform as Platform) : "reels";
  const dims = PLATFORM_DIMS[resolvedPlatform];

  const sourceDims = await probeVideoDimensions(sourcePath);
  const isVerticalSource = sourceDims.h > sourceDims.w;

  await runClipRender({
    sourcePath,
    outputPath,
    startTime: candidate.startTime,
    duration,
    settings,
    dims,
    isVerticalSource,
    hook: candidate.suggestedHook,
    caption: candidate.suggestedCaption,
    score: candidate.score,
  });

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

async function probeVideoDimensions(
  sourcePath: string
): Promise<{ w: number; h: number }> {
  configureFfprobePath();

  return new Promise((resolve) => {
    ffmpeg.ffprobe(sourcePath, (error, metadata) => {
      if (error) {
        resolve({ w: 1920, h: 1080 });
        return;
      }

      const videoStream = metadata.streams?.find(
        (s) => s.codec_type === "video"
      );
      const w = Number(videoStream?.width) || 1920;
      const h = Number(videoStream?.height) || 1080;
      resolve({ w, h });
    });
  });
}

async function runClipRender({
  sourcePath,
  outputPath,
  startTime,
  duration,
  settings,
  dims,
  isVerticalSource,
  hook,
  caption,
  score,
}: {
  sourcePath: string;
  outputPath: string;
  startTime: number;
  duration: number;
  settings: RenderSettings;
  dims: { w: number; h: number };
  isVerticalSource: boolean;
  hook: string;
  caption: string;
  score: number;
}) {
  const quality = qualityOptions[settings.quality];
  const { w, h } = dims;

  const scalePad = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}`;

  const applyZoompan = isVerticalSource && duration <= 60;
  const baseVideo = applyZoompan
    ? `[0:v]${scalePad},zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=${fps},format=yuv420p[vbase]`
    : `[0:v]${scalePad},format=yuv420p[vbase]`;

  const safeHook = truncateForOverlay(hook, 38);
  const safeCaption = truncateForOverlay(caption, 52);
  const escapedHook = escapeDrawtextText(safeHook);
  const escapedCaption = escapeDrawtextText(safeCaption);
  const scoreText = `${score}`;

  const hookEnable = `between(t,0,2.5)`;
  const captionEnable = `between(t,2.5,${duration})`;
  const progressEnable = `gte(t,0)`;
  const fontFile = getFontFile();

  const filters = [
    baseVideo,
    `[vbase]drawbox=x=0:y=ih*0.75:w=iw:h=ih*0.25:color=black@0.45:t=fill[vbox]`,
    `[vbox]drawtext=${fontFile}text='${escapedHook}':fontsize=44:fontcolor=white:borderw=2:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.15:enable='${hookEnable}'[vhook]`,
    `[vhook]drawtext=${fontFile}text='${escapedCaption}':fontsize=34:fontcolor=white:borderw=2:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.80:enable='${captionEnable}'[vcap]`,
    `[vcap]drawbox=x=0:y=ih-6:w=iw*t/${duration}:h=6:color=cyan@0.85:t=fill:enable='${progressEnable}'[vprog]`,
    `[vprog]drawtext=${fontFile}text='${scoreText}':fontsize=28:fontcolor=cyan:borderw=2:bordercolor=black@0.7:x=w-text_w-24:y=24[vout]`,
  ];

  await new Promise<void>((resolve, reject) => {
    configureFfmpegPath();

    ffmpeg()
      .input(sourcePath)
      .inputOptions(["-ss", Math.max(0, startTime).toString()])
      .complexFilter(filters)
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

function truncateForOverlay(text: string, maxChars: number): string {
  if (!text) return "";
  const cleaned = text.replace(/[\r\n]+/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  return cleaned.slice(0, maxChars - 3) + "...";
}

function getFontFile(): string {
  if (process.env.FFMPEG_FONT_PATH) {
    return `fontfile='${process.env.FFMPEG_FONT_PATH}':`;
  }

  if (process.platform === "win32") {
    return "fontfile='C\\:/Windows/Fonts/arial.ttf':";
  }

  return "fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf':";
}

function escapeDrawtextText(text: string): string {
  return text
    .replace(/\\/g, "/")
    .replace(/:/g, " ")
    .replace(/'/g, "")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .slice(0, 220);
}

function configureFfmpegPath() {
  if (process.env.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
  }
}

function configureFfprobePath() {
  if (process.env.FFPROBE_PATH) {
    ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
  }
}

function roundTime(value: number) {
  return Math.round(value * 100) / 100;
}
