import ffmpeg from "fluent-ffmpeg";
import path from "node:path";
import {
  createClipOutputPath,
  ensureRenderDirectories,
} from "@/app/lib/ffmpeg/assets";
import {
  qualityOptions,
  captionStyles,
  captionFontSizes,
  captionPositions,
  defaultCaptionStyleParams,
  type RenderSettings,
  type CaptionStyleId,
  type CaptionStyleParams,
} from "@/app/lib/render-settings";
import type { ClipCandidate } from "@/app/lib/clips";

const fps = 30;

type ClipRenderInput = {
  sourcePath: string;
  candidate: ClipCandidate;
  settings: RenderSettings;
  customWidth?: number;
  customHeight?: number;
  words?: Array<{ word: string; start: number; end: number }>;
  captionStyle?: CaptionStyleId;
  captionStyleParams?: CaptionStyleParams;
  staticHook?: string;
  staticCaption?: string;
  musicPath?: string;
  musicVolume?: number;
};

export async function renderClip({
  sourcePath,
  candidate,
  settings,
  customWidth,
  customHeight,
  words,
  captionStyle,
  captionStyleParams,
  staticHook,
  staticCaption,
  musicPath,
  musicVolume,
}: ClipRenderInput) {
  await ensureRenderDirectories();

  const { filename, outputPath, publicPath, downloadUrl } = createClipOutputPath();
  const duration = roundTime(candidate.endTime - candidate.startTime);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Invalid clip candidate duration.");
  }

  const dims = {
    w: Number.isFinite(customWidth) && customWidth! > 0 ? customWidth! : 1080,
    h: Number.isFinite(customHeight) && customHeight! > 0 ? customHeight! : 1920,
  };

  const sourceDims = await probeVideoDimensions(sourcePath);
  const isVerticalSource = sourceDims.h > sourceDims.w;
  const hasAudio = await probeHasAudio(sourcePath);

  await runClipRender({
    sourcePath,
    outputPath,
    startTime: candidate.startTime,
    duration,
    settings,
    dims,
    isVerticalSource,
    hasAudio,
    words,
    captionStyle,
    captionStyleParams,
    staticHook,
    staticCaption,
    musicPath,
    musicVolume,
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

async function probeHasAudio(sourcePath: string): Promise<boolean> {
  configureFfprobePath();

  return new Promise((resolve) => {
    ffmpeg.ffprobe(sourcePath, (error, metadata) => {
      if (error) {
        resolve(false);
        return;
      }
      const hasAudio = metadata.streams?.some(
        (s) => s.codec_type === "audio"
      );
      resolve(!!hasAudio);
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
  hasAudio,
  words,
  captionStyle,
  captionStyleParams,
  staticHook,
  staticCaption,
  musicPath,
  musicVolume,
}: {
  sourcePath: string;
  outputPath: string;
  startTime: number;
  duration: number;
  settings: RenderSettings;
  dims: { w: number; h: number };
  isVerticalSource: boolean;
  hasAudio: boolean;
  words?: Array<{ word: string; start: number; end: number }>;
  captionStyle?: CaptionStyleId;
  captionStyleParams?: CaptionStyleParams;
  staticHook?: string;
  staticCaption?: string;
  musicPath?: string;
  musicVolume?: number;
}) {
  const quality = qualityOptions[settings.quality];
  const { w, h } = dims;

  const scalePad = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}`;

  const applyZoompan = isVerticalSource && duration <= 60;
  const baseVideo = applyZoompan
    ? `[0:v]${scalePad},zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=${fps},crop=iw:ih:0:0,format=yuv420p[vbase]`
    : `[0:v]${scalePad},format=yuv420p[vbase]`;

  const progressEnable = `gte(t,0)`;
  const fontFile = getFontFile();
  const captionSize = Math.max(40, Math.min(64, Math.round(h * 0.036)));

  const useStatic = !!(staticHook || staticCaption);
  const { filters: textFilters, lastLabel } = useStatic
    ? buildStaticCaptionFilters(
        staticHook || "",
        staticCaption || "",
        duration,
        fontFile,
        captionSize,
        captionStyleParams
      )
    : buildWordCaptionFilters(
        words || [],
        startTime,
        duration,
        fontFile,
        captionSize,
        captionStyle,
        captionStyleParams
      );

  const vol = clampNumber(musicVolume ?? 30, 0, 100) / 100;

  const audioFilters: string[] = [];
  if (musicPath && hasAudio) {
    audioFilters.push(
      `[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${vol.toFixed(2)}[music]`
    );
    audioFilters.push(
      `[0:a][music]amix=inputs=2:duration=first:dropout_transition=0[aout]`
    );
  } else if (musicPath && !hasAudio) {
    audioFilters.push(
      `[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${vol.toFixed(2)}[aout]`
    );
  }

  const filters = [
    baseVideo,
    `[vbase]drawbox=x=0:y=ih*0.45:w=iw:h=ih*0.08:color=black@0.03:t=fill[vg1]`,
    `[vg1]drawbox=x=0:y=ih*0.53:w=iw:h=ih*0.08:color=black@0.06:t=fill[vg2]`,
    `[vg2]drawbox=x=0:y=ih*0.61:w=iw:h=ih*0.08:color=black@0.10:t=fill[vg3]`,
    `[vg3]drawbox=x=0:y=ih*0.69:w=iw:h=ih*0.08:color=black@0.15:t=fill[vg4]`,
    `[vg4]drawbox=x=0:y=ih*0.77:w=iw:h=ih*0.08:color=black@0.22:t=fill[vg5]`,
    `[vg5]drawbox=x=0:y=ih*0.85:w=iw:h=ih*0.15:color=black@0.30:t=fill[vgrad]`,
    `[vgrad]format=yuv420p[vready]`,
    ...textFilters.map((f, i) => {
      if (i === 0) {
        return f.replace(`[vbase]`, `[vready]`);
      }
      return f;
    }),
    `[${lastLabel}]drawbox=x=0:y=ih-6:w=iw*t/${duration}:h=6:color=cyan@0.85:t=fill:enable='${progressEnable}'[vout]`,
    ...audioFilters,
  ];

  const audioMap = musicPath ? ["-map", "[aout]"] : ["-map", "0:a?"];

  console.log("[MUSIC] musicPath:", musicPath, "musicVolume:", musicVolume, "hasAudio:", hasAudio, "vol:", vol, "audioFilters:", audioFilters.length, "audioMap:", audioMap);

  await new Promise<void>((resolve, reject) => {
    configureFfmpegPath();

    const cmd = ffmpeg()
      .input(sourcePath)
      .inputOptions(["-ss", Math.max(0, startTime).toString()]);

    if (musicPath) {
      cmd.input(musicPath);
    }

    cmd
      .complexFilter(filters)
      .outputOptions([
        "-map",
        "[vout]",
        ...audioMap,
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

type PhraseGroup = {
  text: string;
  start: number;
  end: number;
};

function buildWordCaptionFilters(
  words: Array<{ word: string; start: number; end: number }>,
  clipStart: number,
  clipDuration: number,
  fontFile: string,
  captionSize: number,
  styleId?: CaptionStyleId,
  params?: CaptionStyleParams
): { filters: string[]; lastLabel: string } {
  if (!words.length) return { filters: [], lastLabel: "vready" };

  const granular = params || defaultCaptionStyleParams;
  const presetStyle = captionStyles[styleId || "classic"];
  const useGranular = !!params;

  const clipEnd = clipStart + clipDuration;
  const overlapping = words
    .filter((w) => w.end > clipStart && w.start < clipEnd)
    .map((w) => ({
      word: w.word,
      start: Math.max(0, w.start - clipStart),
      end: Math.min(clipDuration, w.end - clipStart),
    }))
    .sort((a, b) => a.start - b.start);

  if (!overlapping.length) return { filters: [], lastLabel: "vready" };

  const phrases: PhraseGroup[] = [];
  let current: PhraseGroup = {
    text: overlapping[0].word,
    start: overlapping[0].start,
    end: overlapping[0].end,
  };
  let wordCount = 1;

  for (let i = 1; i < overlapping.length; i++) {
    const w = overlapping[i];
    const gap = w.start - current.end;
    if (wordCount >= 2 || gap > 0.3) {
      phrases.push(current);
      current = { text: w.word, start: w.start, end: w.end };
      wordCount = 1;
    } else {
      current.text += " " + w.word;
      current.end = w.end;
      wordCount++;
    }
  }
  phrases.push(current);

  const maxPhrases = 30;
  const capped = phrases.slice(0, maxPhrases);

  const filters: string[] = [];
  let prevLabel = "vready";

  for (let i = 0; i < capped.length; i++) {
    const p = capped[i];
    const escaped = escapeDrawtextText(p.text);
    const nextLabel = `vcaption${i}`;
    let shadow = "";
    let border = "";
    let fontSize = captionSize;
    let fontColor = presetStyle.fontColor;
    let yPos = "h*0.80";

    if (useGranular) {
      fontSize = captionFontSizes[granular.fontSize] || captionSize;
      fontColor = granular.fontColor;
      yPos = captionPositions[granular.position] || "h*0.80";

      if (granular.background === "dark") {
        shadow = `:shadowx=3:shadowy=3:shadowcolor=black@0.9`;
        border = `:borderw=2:bordercolor=black@0.8`;
      } else if (granular.background === "light") {
        shadow = `:shadowx=2:shadowy=2:shadowcolor=white@0.6`;
        border = `:borderw=1:bordercolor=white@0.4`;
      }
    } else {
      shadow =
        presetStyle.shadowX > 0 || presetStyle.shadowY > 0
          ? `:shadowx=${presetStyle.shadowX}:shadowy=${presetStyle.shadowY}:shadowcolor=${presetStyle.shadowColor}`
          : "";
      border =
        presetStyle.borderWidth > 0
          ? `:borderw=${presetStyle.borderWidth}:bordercolor=${presetStyle.borderColor}`
          : "";
    }

    filters.push(
      `[${prevLabel}]drawtext=${fontFile}text='${escaped}':fontsize=${fontSize}:fontcolor=${fontColor}${shadow}${border}:x='max(80,(w-text_w)/2)':y=${yPos}:enable='between(t,${p.start.toFixed(3)},${p.end.toFixed(3)})'[${nextLabel}]`
    );
    prevLabel = nextLabel;
  }

  return { filters, lastLabel: prevLabel };
}

function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitCaptionLines(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    const candidate = current.length ? current.join(" ") + " " + word : word;
    if (current.length >= 6 || candidate.length > 45) {
      if (current.length) lines.push(current.join(" "));
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length) lines.push(current.join(" "));
  return lines;
}

function buildStaticCaptionFilters(
  hook: string,
  caption: string,
  clipDuration: number,
  fontFile: string,
  captionSize: number,
  params?: CaptionStyleParams
): { filters: string[]; lastLabel: string } {
  const granular = params || defaultCaptionStyleParams;
  const fontSize = captionFontSizes[granular.fontSize] || captionSize;
  const fontColor = granular.fontColor;
  const captionY = captionPositions[granular.position] || "h*0.80";
  const hookY =
    captionPositions[granular.hookPosition || "top"] || "h*0.10";

  let shadow = "";
  let border = "";
  if (granular.background === "dark") {
    shadow = `:shadowx=3:shadowy=3:shadowcolor=black@0.9`;
    border = `:borderw=2:bordercolor=black@0.8`;
  } else if (granular.background === "light") {
    shadow = `:shadowx=2:shadowy=2:shadowcolor=white@0.6`;
    border = `:borderw=1:bordercolor=white@0.4`;
  }

  const filters: string[] = [];
  let prevLabel = "vready";
  const hasHook = !!hook;

  if (hasHook) {
    const escaped = escapeDrawtextText(stripEmoji(hook));
    const hookEnd = Math.min(3, clipDuration);
    const label = "vhook";
    filters.push(
      `[${prevLabel}]drawtext=${fontFile}text='${escaped}':fontsize=${Math.round(fontSize * 1.15)}:fontcolor=${fontColor}${shadow}${border}:x='max(60,(w-text_w)/2)':y=${hookY}:enable='between(t,0,${hookEnd.toFixed(3)})'[${label}]`
    );
    prevLabel = label;
  }

  if (caption) {
    const cleanCaption = stripEmoji(caption);
    const lines = splitCaptionLines(cleanCaption);
    if (lines.length) {
      const captionStart = hasHook ? 3.0 : 0.0;
      const captionDuration = Math.max(0.1, clipDuration - captionStart);
      const MAX_SEC = 5.0;
      const timePerLine = Math.min(MAX_SEC, captionDuration / lines.length);

      for (let i = 0; i < lines.length; i++) {
        const escaped = escapeDrawtextText(lines[i]);
        const lineStart = captionStart + i * timePerLine;
        const isLast = i === lines.length - 1;
        const lineEnd = isLast
          ? clipDuration
          : Math.min(captionStart + (i + 1) * timePerLine, clipDuration);
        const label = `vcaption${i}`;
        filters.push(
          `[${prevLabel}]drawtext=${fontFile}text='${escaped}':fontsize=${fontSize}:fontcolor=${fontColor}${shadow}${border}:x='max(60,(w-text_w)/2)':y=${captionY}:enable='between(t,${lineStart.toFixed(3)},${lineEnd.toFixed(3)})'[${label}]`
        );
        prevLabel = label;
      }
    }
  }

  return { filters, lastLabel: prevLabel };
}

function toFFmpegPath(p: string): string {
  return p
    .replace(/\\/g, "/")
    .replace(/^([A-Z]):/, (_, drive: string) => drive + "\\:");
}

function getFontFile(): string {
  if (process.env.FFMPEG_FONT_PATH) {
    return `fontfile='${process.env.FFMPEG_FONT_PATH}':`;
  }

  const localFont = path.join(
    process.cwd(),
    "assets",
    "fonts",
    "Montserrat-Bold.ttf"
  );
  return `fontfile='${toFFmpegPath(localFont)}':`;
}

function escapeDrawtextText(text: string): string {
  return stripEmoji(text)
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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
