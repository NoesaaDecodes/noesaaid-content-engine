import ffmpeg from "fluent-ffmpeg";
import { execFile } from "node:child_process";
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

export type CaptionEffect = "fade" | "pop" | "slide-up" | "karaoke" | "bounce" | "punch" | "shake";

export type RenderMode = "generate" | "quick-cut" | "studio";

type ClipRenderInput = {
  sourcePath: string;
  candidate: ClipCandidate;
  settings: RenderSettings;
  renderMode?: RenderMode;
  customWidth?: number;
  customHeight?: number;
  words?: Array<{ word: string; start: number; end: number }>;
  captionStyle?: CaptionStyleId;
  captionStyleParams?: CaptionStyleParams;
  staticHook?: string;
  staticCaption?: string;
  musicPath?: string;
  musicVolume?: number;
  captionEffect?: CaptionEffect;
  smartCrop?: boolean;
  blurBackground?: boolean;
};

export async function renderClip({
  sourcePath,
  candidate,
  settings,
  renderMode,
  customWidth,
  customHeight,
  words,
  captionStyle,
  captionStyleParams,
  staticHook,
  staticCaption,
  musicPath,
  musicVolume,
  captionEffect,
  smartCrop,
  blurBackground,
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

  const t0 = Date.now();
  console.log("[RENDER START] mode:", renderMode || "default", "quality:", settings.quality);
  await runClipRender({
    sourcePath,
    outputPath,
    startTime: candidate.startTime,
    duration,
    settings,
    renderMode,
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
    captionEffect,
    smartCrop,
    blurBackground,
  });

  console.log("[RENDER DONE]", Date.now() - t0, "ms", outputPath);

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

type CropRect = { w: number; h: number; x: number; y: number };
type FaceCropResult = CropRect & { faceX: number; faceY: number; method: string };

async function detectFaceCrop(
  sourcePath: string,
  startTime: number,
  duration: number,
  targetW: number,
  targetH: number
): Promise<FaceCropResult | null> {
  configureFfmpegPath();

  // Step 1: Probe source dimensions
  const sourceDims = await probeVideoDimensions(sourcePath);
  const isLandscapeToVertical = sourceDims.w > sourceDims.h && targetH > targetW;

  // Step 2: Try cropdetect for content region
  const cropResult = await runCropdetect(sourcePath, startTime, duration);

  if (!cropResult) {
    return null;
  }

  // Step 3: For landscape→vertical, try motion-based face detection
  if (isLandscapeToVertical) {
    const motionCenter = await detectMotionCenter(sourcePath, startTime, duration, sourceDims.w, sourceDims.h);

    if (motionCenter) {
      // Use motion center as face position
      const faceX = clampNumber(Math.round(motionCenter.x - targetW / 2), 0, sourceDims.w - targetW);
      const faceY = clampNumber(Math.round(motionCenter.y - targetH / 2), 0, sourceDims.h - targetH);

      console.log(`[FACE CROP] motion center: (${motionCenter.x}, ${motionCenter.y}), crop offset: (${faceX}, ${faceY})`);

      return {
        w: cropResult.w,
        h: cropResult.h,
        x: faceX,
        y: faceY,
        faceX: motionCenter.x,
        faceY: motionCenter.y,
        method: "motion",
      };
    }
  }

  // Step 4: Fallback to cropdetect region center
  const centerX = cropResult.x + Math.round(cropResult.w / 2);
  const centerY = cropResult.y + Math.round(cropResult.h / 2);

  console.log(`[FACE CROP] fallback to cropdetect center: (${centerX}, ${centerY})`);

  return {
    ...cropResult,
    faceX: centerX,
    faceY: centerY,
    method: "cropdetect",
  };
}

async function runCropdetect(
  sourcePath: string,
  startTime: number,
  duration: number
): Promise<CropRect | null> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
  const args = [
    "-y",
    "-ss", Math.max(0, startTime).toString(),
    "-t", Math.min(duration, 30).toString(),
    "-i", sourcePath,
    "-vf", "cropdetect=limit=24:round=2:skip=2",
    "-f", "null",
    "-",
  ];

  return new Promise((resolve) => {
    execFile(ffmpegPath, args, { timeout: 30_000, maxBuffer: 5 * 1024 * 1024 }, (_error, _stdout, stderr) => {
      const output = stderr || "";
      const crops: CropRect[] = [];

      for (const line of output.split("\n")) {
        const match = line.match(/crop=(\d+):(\d+):(\d+):(\d+)/);
        if (match) {
          crops.push({
            w: parseInt(match[1], 10),
            h: parseInt(match[2], 10),
            x: parseInt(match[3], 10),
            y: parseInt(match[4], 10),
          });
        }
      }

      if (!crops.length) {
        resolve(null);
        return;
      }

      crops.sort((a, b) => a.w - b.w);
      const mid = Math.floor(crops.length / 2);
      resolve(crops[mid]);
    });
  });
}

type MotionPoint = { x: number; y: number };

async function detectMotionCenter(
  sourcePath: string,
  startTime: number,
  duration: number,
  sourceW: number,
  sourceH: number
): Promise<MotionPoint | null> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";

  // Order 15 FIX 5: Sample 5 frames with weighted average
  const sampleFractions = [0.1, 0.25, 0.5, 0.75, 0.9];
  const weights = [0.1, 0.2, 0.4, 0.2, 0.1];
  const samplePoints = sampleFractions.map((p) => Math.max(0, startTime + duration * p));

  const results: MotionPoint[] = [];

  for (const sampleTime of samplePoints) {
    const result = await analyzeFrameMotion(ffmpegPath, sourcePath, sampleTime, sourceW, sourceH);
    if (result) {
      results.push(result);
    }
  }

  if (!results.length) {
    return null;
  }

  // Smooth jitter: if consecutive X values differ > 20%, use median instead of average
  const xs = results.map((r) => r.x);
  const hasJitter = xs.some((x, i) => i > 0 && Math.abs(x - xs[i - 1]) > sourceW * 0.2);

  let finalX: number;
  let finalY: number;

  if (hasJitter && results.length >= 3) {
    // Use median for stability
    const sortedX = [...xs].sort((a, b) => a - b);
    const sortedY = results.map((r) => r.y).sort((a, b) => a - b);
    finalX = sortedX[Math.floor(sortedX.length / 2)];
    finalY = sortedY[Math.floor(sortedY.length / 2)];
    console.log(`[FACE CROP] jitter detected, using median: (${finalX}, ${finalY})`);
  } else {
    // Weighted average
    const usedWeights = weights.slice(0, results.length);
    const totalWeight = usedWeights.reduce((s, w) => s + w, 0);
    finalX = Math.round(results.reduce((s, r, i) => s + r.x * usedWeights[i], 0) / totalWeight);
    finalY = Math.round(results.reduce((s, r, i) => s + r.y * usedWeights[i], 0) / totalWeight);
  }

  // Upper-third bias: faces are usually in upper 60% of frame
  if (finalY > sourceH * 0.6) {
    finalY = Math.round(finalY * 0.7);
    console.log(`[FACE CROP] upper-third bias applied, Y adjusted to ${finalY}`);
  }

  console.log(`[FACE CROP] frames sampled: ${results.length}, weighted center: (${finalX}, ${finalY})`);

  return { x: finalX, y: finalY };
}

async function analyzeFrameMotion(
  ffmpegPath: string,
  sourcePath: string,
  sampleTime: number,
  sourceW: number,
  sourceH: number
): Promise<MotionPoint | null> {
  // Use a simple approach: extract a frame, split into grid, find region with highest contrast
  // This approximates "where is the interesting content" without needing opencv
  const gridSize = 3;
  const cellW = Math.floor(sourceW / gridSize);
  const cellH = Math.floor(sourceH / gridSize);

  // Extract raw pixel data for a small thumbnail
  const thumbW = 96;
  const thumbH = Math.round((thumbW / sourceW) * sourceH);
  const args = [
    "-y",
    "-ss", sampleTime.toString(),
    "-i", sourcePath,
    "-vf", `scale=${thumbW}:${thumbH}:force_original_aspect_ratio=decrease`,
    "-frames:v", "1",
    "-f", "rawvideo",
    "-pix_fmt", "gray",
    "-",
  ];

  return new Promise((resolve) => {
    execFile(ffmpegPath, args, { timeout: 15_000, maxBuffer: 2 * 1024 * 1024, encoding: "buffer" }, (_error, stdout) => {
      const buf = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout || "");
      if (buf.length < thumbW * thumbH) {
        resolve(null);
        return;
      }

      const pixels = buf;
      const cellWidth = Math.floor(thumbW / gridSize);
      const cellHeight = Math.floor(thumbH / gridSize);

      let bestScore = -1;
      let bestX = Math.floor(sourceW / 2);
      let bestY = Math.floor(sourceH / 2);

      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          let sum = 0;
          let sumSq = 0;
          let count = 0;

          for (let y = gy * cellHeight; y < (gy + 1) * cellHeight && y < thumbH; y++) {
            for (let x = gx * cellWidth; x < (gx + 1) * cellWidth && x < thumbW; x++) {
              const val = pixels[y * thumbW + x];
              if (val !== undefined) {
                sum += val;
                sumSq += val * val;
                count++;
              }
            }
          }

          if (count === 0) continue;

          const mean = sum / count;
          const variance = sumSq / count - mean * mean;
          // Score = variance (contrast) + brightness bonus (faces tend to be brighter)
          const score = variance + mean * 0.3;

          if (score > bestScore) {
            bestScore = score;
            bestX = (gx + 0.5) * cellW;
            bestY = (gy + 0.5) * cellH;
          }
        }
      }

      resolve({ x: Math.round(bestX), y: Math.round(bestY) });
    });
  });
}

async function runClipRender({
  sourcePath,
  outputPath,
  startTime,
  duration,
  settings,
  renderMode,
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
  captionEffect,
  smartCrop,
  blurBackground,
}: {
  sourcePath: string;
  outputPath: string;
  startTime: number;
  duration: number;
  settings: RenderSettings;
  renderMode?: RenderMode;
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
  captionEffect?: CaptionEffect;
  smartCrop?: boolean;
  blurBackground?: boolean;
}) {
  const quality = qualityOptions[settings.quality];
  const isDraft = settings.quality === "draft";
  const isGenerate = renderMode === "generate" || renderMode === "quick-cut";
  const w = isDraft ? Math.min(dims.w, 720) : dims.w;
  const h = isDraft ? Math.min(dims.h, 1280) : dims.h;

  let scalePad = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}`;

  if (smartCrop && !isDraft && !isGenerate) {
    const faceCrop = await detectFaceCrop(sourcePath, startTime, duration, w, h);
    if (faceCrop) {
      const xOffset = clampNumber(faceCrop.faceX - Math.round(w / 2), 0, Math.max(0, faceCrop.w - w));
      const yOffset = clampNumber(faceCrop.faceY - Math.round(h / 2), 0, Math.max(0, faceCrop.h - h));
      console.log(`[FACE CROP] method=${faceCrop.method} face=(${faceCrop.faceX},${faceCrop.faceY}) offset=(${xOffset},${yOffset})`);
      scalePad = `crop=${Math.min(faceCrop.w, w)}:${Math.min(faceCrop.h, h)}:${xOffset}:${yOffset},scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}`;
    } else {
      console.log("[FACE CROP] detection failed, using center crop");
    }
  }

  const useBlurBg = blurBackground && !isDraft && !isGenerate && !isVerticalSource && h > w;
  // Only apply zoompan for short vertical clips in studio mode
  const applyZoompan = !isDraft && !isGenerate && isVerticalSource && duration <= 8 && !useBlurBg;

  let baseVideo: string;
  const extraFilters: string[] = [];

  if (useBlurBg) {
    // Blurred background for landscape→vertical (expensive, only when explicitly enabled)
    const bgBlur = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=20:10[bgblur]`;
    const fgScale = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg]`;
    const overlay = `[bgblur][fg]overlay=(W-w)/2:(H-h)/2:shortest=1,setsar=1,fps=${fps}[vblurred]`;
    extraFilters.push(bgBlur, fgScale, overlay);
    baseVideo = `[vblurred]format=yuv420p[vbase]`;
  } else if (applyZoompan) {
    // Simple slow zoom — single expression, no nested ifs
    baseVideo = `[0:v]${scalePad},zoompan=z='min(zoom+0.0008,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=${fps},format=yuv420p[vbase]`;
  } else {
    baseVideo = `[0:v]${scalePad},format=yuv420p[vbase]`;
  }

  const progressEnable = `gte(t,0)`;
  const fontFile = getFontFile();
  const captionSize = Math.max(40, Math.min(64, Math.round(h * 0.036)));

  const useStatic = !!(staticHook || staticCaption);
  const effect = (isDraft || isGenerate) ? "fade" : (captionEffect || "fade");
  const { filters: textFilters, lastLabel } = useStatic
    ? buildStaticCaptionFilters(
        staticHook || "",
        staticCaption || "",
        duration,
        fontFile,
        captionSize,
        captionStyleParams,
        effect
      )
    : buildWordCaptionFilters(
        words || [],
        startTime,
        duration,
        fontFile,
        captionSize,
        captionStyle,
        captionStyleParams,
        effect
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

  // Gradient: single layer for generate mode, 3 layers for studio
  const gradientFilters = isDraft
    ? [`[vbase]format=yuv420p[vready]`]
    : isGenerate
      ? [
          `[vbase]drawbox=x=0:y=ih*0.55:w=iw:h=ih*0.45:color=black@0.45:t=fill[vgrad]`,
          `[vgrad]format=yuv420p[vready]`,
        ]
      : [
          `[vbase]drawbox=x=0:y=ih*0.50:w=iw:h=ih*0.12:color=black@0.08:t=fill[vg1]`,
          `[vg1]drawbox=x=0:y=ih*0.62:w=iw:h=ih*0.15:color=black@0.18:t=fill[vg2]`,
          `[vg2]drawbox=x=0:y=ih*0.77:w=iw:h=ih*0.23:color=black@0.30:t=fill[vgrad]`,
          `[vgrad]format=yuv420p[vready]`,
        ];

  const filters = [
    ...extraFilters,
    baseVideo,
    ...gradientFilters,
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

  console.log("[FILTERS]", filters.length, "total | textFilters:", textFilters.length, "extra:", extraFilters.length, "gradient:", gradientFilters.length, "audio:", audioFilters.length);
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

function buildAlphaExpr(
  effect: CaptionEffect,
  s: number,
  e: number
): string {
  const ss = s.toFixed(3);
  const ee = e.toFixed(3);
  const fadeEnd = (e - 0.08).toFixed(3);

  switch (effect) {
    case "pop":
      return `'if(lt(t-${ss}\\,0.05)\\,(t-${ss})/0.05\\,1)'`;
    case "karaoke":
      return `'if(lt(t-${ss}\\,0.05)\\,(t-${ss})/0.05\\,1)'`;
    case "bounce":
      return `'if(lt(t-${ss}\\,0.10)\\,(t-${ss})/0.10\\,1)'`;
    case "punch":
      return `'if(lt(t-${ss}\\,0.06)\\,(t-${ss})/0.06\\,1)'`;
    case "shake":
      return `'if(lt(t-${ss}\\,0.04)\\,(t-${ss})/0.04\\,1)'`;
    case "slide-up":
      return `'if(lt(t-${ss}\\,0.12)\\,(t-${ss})/0.12\\,if(gt(t\\,${fadeEnd})\\,(${ee}-t)/0.08\\,1))'`;
    case "fade":
    default:
      return `'if(lt(t-${ss}\\,0.12)\\,(t-${ss})/0.12\\,if(gt(t\\,${fadeEnd})\\,(${ee}-t)/0.08\\,1))'`;
  }
}

function buildYExpr(
  effect: CaptionEffect,
  baseY: string,
  s: number
): string {
  if (effect === "slide-up") {
    const ss = s.toFixed(3);
    const rise = "min(1\\,10*(t-".concat(ss, "))");
    return `'${baseY}+40*(1-${rise})'`;
  }
  if (effect === "bounce") {
    const ss = s.toFixed(3);
    return `'${baseY}+abs(sin((t-${ss})*12))*8'`;
  }
  if (effect === "shake") {
    const ss = s.toFixed(3);
    const shakeEnd = (s + 0.2).toFixed(3);
    return `'${baseY}+if(between(t\\,${ss}\\,${shakeEnd})\\,2*sin((t-${ss})*60)\\,0)'`;
  }
  return baseY;
}

function buildFontsizeExpr(
  effect: CaptionEffect,
  baseSize: number,
  s: number
): string {
  if (effect !== "punch") return baseSize.toString();
  const ss = s.toFixed(3);
  const peak = Math.round(baseSize * 1.4);
  return `'if(lt(t-${ss}\\,0.08)\\,${peak}-${baseSize}*0.4*((t-${ss})/0.08)\\,${baseSize})'`;
}

function buildWordCaptionFilters(
  words: Array<{ word: string; start: number; end: number }>,
  clipStart: number,
  clipDuration: number,
  fontFile: string,
  captionSize: number,
  styleId?: CaptionStyleId,
  params?: CaptionStyleParams,
  effect: CaptionEffect = "fade"
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

  const maxPhrases = 15;
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
      } else if (granular.background === "glow") {
        // Glow uses multiple layers, handled below
        shadow = "";
        border = `:borderw=2:bordercolor=${fontColor}@0.8`;
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

    const wordEnd =
      effect === "karaoke" ? Math.min(clipDuration, p.end + 0.05) : p.end;
    const s = p.start.toFixed(3);
    const e = wordEnd.toFixed(3);
    const alphaExpr = buildAlphaExpr(effect, p.start, wordEnd);
    const yExpr = buildYExpr(effect, yPos, p.start);
    const fontsizeExpr = buildFontsizeExpr(effect, fontSize, p.start);

    // Glow: 1 blur layer + 1 sharp layer (max 2 total)
    const isGlow = useGranular && granular.background === "glow";
    if (isGlow) {
      const glowLabel = `vglow_${i}`;
      filters.push(
        `[${prevLabel}]drawtext=${fontFile}text='${escaped}':fontsize=${fontsizeExpr}:fontcolor=${fontColor}:alpha=${alphaExpr}:borderw=6:bordercolor=${fontColor}@0.4:x='max(80,(w-text_w)/2)':y=${yExpr}:enable='between(t,${s},${e})'[${glowLabel}]`
      );
      prevLabel = glowLabel;
    }

    filters.push(
      `[${prevLabel}]drawtext=${fontFile}text='${escaped}':fontsize=${fontsizeExpr}:fontcolor=${fontColor}:alpha=${alphaExpr}${shadow}${border}:x='max(80,(w-text_w)/2)':y=${yExpr}:enable='between(t,${s},${e})'[${nextLabel}]`
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
  params?: CaptionStyleParams,
  effect: CaptionEffect = "fade"
): { filters: string[]; lastLabel: string } {
  const granular = params || defaultCaptionStyleParams;
  const fontSize = captionFontSizes[granular.fontSize] || captionSize;
  const fontColor = granular.fontColor;
  const captionY = captionPositions[granular.position] || "h*0.80";
  const hookY =
    captionPositions[granular.hookPosition || "top"] || "h*0.10";

  let shadow = "";
  let border = "";
  const isGlow = granular.background === "glow";
  if (granular.background === "dark") {
    shadow = `:shadowx=3:shadowy=3:shadowcolor=black@0.9`;
    border = `:borderw=2:bordercolor=black@0.8`;
  } else if (granular.background === "light") {
    shadow = `:shadowx=2:shadowy=2:shadowcolor=white@0.6`;
    border = `:borderw=1:bordercolor=white@0.4`;
  } else if (isGlow) {
    shadow = "";
    border = `:borderw=2:bordercolor=${fontColor}@0.8`;
  }

  const filters: string[] = [];
  let prevLabel = "vready";
  const hasHook = !!hook;

  if (hasHook) {
    const escaped = escapeDrawtextText(stripEmoji(hook));
    const hookEnd = Math.min(3, clipDuration);
    const hookFontSize = Math.round(fontSize * 1.15);
    const label = "vhook";
    const hEnd = hookEnd.toFixed(3);
    const alphaExpr = buildAlphaExpr(effect, 0, hookEnd);
    const hookYExpr = buildYExpr(effect, hookY, 0);
    const hookFontsizeExpr = buildFontsizeExpr(effect, hookFontSize, 0);

    if (isGlow) {
      const glowLabel = "vhook_glow";
      filters.push(
        `[${prevLabel}]drawtext=${fontFile}text='${escaped}':fontsize=${hookFontsizeExpr}:fontcolor=${fontColor}:alpha=${alphaExpr}:borderw=6:bordercolor=${fontColor}@0.4:x='max(60,(w-text_w)/2)':y=${hookYExpr}:enable='between(t,0,${hEnd})'[${glowLabel}]`
      );
      prevLabel = glowLabel;
    }

    filters.push(
      `[${prevLabel}]drawtext=${fontFile}text='${escaped}':fontsize=${hookFontsizeExpr}:fontcolor=${fontColor}:alpha=${alphaExpr}${shadow}${border}:x='max(60,(w-text_w)/2)':y=${hookYExpr}:enable='between(t,0,${hEnd})'[${label}]`
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
        const alphaExpr = buildAlphaExpr(effect, lineStart, lineEnd);
        const yExpr = buildYExpr(effect, captionY, lineStart);
        const fontsizeExpr = buildFontsizeExpr(effect, fontSize, lineStart);

        if (isGlow) {
          const glowLabel = `vcap_glow_${i}`;
          filters.push(
            `[${prevLabel}]drawtext=${fontFile}text='${escaped}':fontsize=${fontsizeExpr}:fontcolor=${fontColor}:alpha=${alphaExpr}:borderw=6:bordercolor=${fontColor}@0.4:x='max(60,(w-text_w)/2)':y=${yExpr}:enable='between(t,${lineStart.toFixed(3)},${lineEnd.toFixed(3)})'[${glowLabel}]`
          );
          prevLabel = glowLabel;
        }

        filters.push(
          `[${prevLabel}]drawtext=${fontFile}text='${escaped}':fontsize=${fontsizeExpr}:fontcolor=${fontColor}:alpha=${alphaExpr}${shadow}${border}:x='max(60,(w-text_w)/2)':y=${yExpr}:enable='between(t,${lineStart.toFixed(3)},${lineEnd.toFixed(3)})'[${label}]`
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
