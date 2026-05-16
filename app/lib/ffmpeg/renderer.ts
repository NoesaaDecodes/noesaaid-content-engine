import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import ffmpeg from "fluent-ffmpeg";
import {
  createOutputPath,
  ensureRenderDirectories,
  findFirstFootage,
  findFirstMusic,
  renderTempDir,
  resolveFootageFile,
  resolveMusicFile,
} from "./assets";
import { buildSubtitleScenes, SubtitleScene } from "./subtitles";
import { getTemplateById, ReelTemplate } from "@/app/lib/templates";
import {
  normalizeRenderSettings,
  qualityOptions,
  subtitleSizeScale,
  type RenderSettings,
} from "@/app/lib/render-settings";
import {
  buildRetentionPlan,
  type RetentionPlan,
} from "@/app/lib/retention";

type RenderInput = {
  title?: string;
  hook?: string;
  script: string[] | string;
  caption?: string;
  hashtags?: string[] | string;
  footageFile?: string;
  musicFile?: string;
  templateId?: string;
  durationMode?: string;
  subtitleSize?: string;
  quality?: string;
};

const width = 1080;
const height = 1920;
const fps = 30;

export async function renderReel(input: RenderInput) {
  await ensureRenderDirectories();

  const template = getTemplateById(input.templateId);
  const settings = normalizeRenderSettings(input);
  const retentionPlan = buildRetentionPlan({
    script: input.script,
    template,
    settings,
  });
  const { scenes, duration } = buildSubtitleScenes(
    input.script,
    template,
    settings,
    retentionPlan
  );
  const selectedFootage =
    (await resolveFootageFile(input.footageFile)) || (await findFirstFootage());
  const selectedMusic =
    (await resolveMusicFile(input.musicFile)) || (await findFirstMusic());
  const { filename, outputPath, publicPath, downloadUrl } = createOutputPath();
  const tempDir = path.join(renderTempDir, filename.replace(".mp4", ""));

  await mkdir(tempDir, { recursive: true });
  const subtitleFiles = await writeSubtitleFiles(
    tempDir,
    scenes,
    template,
    settings
  );
  const fallbackImage = selectedFootage
    ? null
    : await writeFallbackBackground(tempDir);

  try {
    try {
      await runRender({
        outputPath,
        duration,
        selectedFootage,
        selectedMusic,
        fallbackImage,
        scenes,
        subtitleFiles,
        template,
        settings,
        cinematicEnabled: true,
        retentionPlan,
      });
    } catch (error) {
      if (safeMotionProfile(template.motionProfile) === "none") {
        throw error;
      }

      await rm(outputPath, { force: true });
      await runRender({
        outputPath,
        duration,
        selectedFootage,
        selectedMusic,
        fallbackImage,
        scenes,
        subtitleFiles,
        template,
        settings,
        cinematicEnabled: false,
        retentionPlan,
      });
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  return {
    filename,
    outputPath,
    publicPath,
    downloadUrl,
    duration,
    usedFootage: selectedFootage ? path.basename(selectedFootage) : null,
    usedMusic: selectedMusic ? path.basename(selectedMusic) : null,
    subtitleCount: scenes.length,
    templateId: template.id,
    templateName: template.name,
    motionProfile: template.motionProfile,
    retention: {
      scrollStopScore: retentionPlan.scrollStopScore,
      pacingProfile: retentionPlan.pacingProfile,
      dopamineBeats: retentionPlan.dopamineBeats,
      loopFriendlyEnding: retentionPlan.loopFriendlyEnding,
      subtitleEmphasisPlan: retentionPlan.subtitleEmphasisPlan,
      sceneCompositionHints: retentionPlan.sceneCompositionHints,
    },
    settings,
  };
}

async function runRender({
  outputPath,
  duration,
  selectedFootage,
  selectedMusic,
  fallbackImage,
  scenes,
  subtitleFiles,
  template,
  settings,
  cinematicEnabled,
  retentionPlan,
}: {
  outputPath: string;
  duration: number;
  selectedFootage: string | null;
  selectedMusic: string | null;
  fallbackImage: string | null;
  scenes: SubtitleScene[];
  subtitleFiles: string[];
  template: ReelTemplate;
  settings: RenderSettings;
  cinematicEnabled: boolean;
  retentionPlan: RetentionPlan;
}) {
  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg();
    configureFfmpegPath();

    if (selectedFootage) {
      command.input(selectedFootage).inputOptions(["-stream_loop", "-1"]);
    } else {
      command
        .input(fallbackImage || "")
        .inputOptions(["-loop", "1", "-framerate", fps.toString()]);
    }

    if (selectedMusic) {
      command.input(selectedMusic).inputOptions(["-stream_loop", "-1"]);
    }

    const quality = qualityOptions[settings.quality];
    const audioOptions = selectedMusic ? ["-map", "1:a", "-c:a", "aac", "-b:a", quality.audioBitrate] : ["-an"];

    command
      .complexFilter(
        buildVideoFilters(
          scenes,
          subtitleFiles,
          template,
          duration,
          settings,
          cinematicEnabled,
          retentionPlan
        )
      )
      .outputOptions([
        "-map",
        "[vout]",
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
        ...audioOptions,
        "-shortest",
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
  const ffmpegPath = process.env.FFMPEG_PATH;

  if (ffmpegPath) {
    const ffmpegWithPath = ffmpeg as unknown as {
      setFfmpegPath?: (path: string) => void;
    };
    ffmpegWithPath.setFfmpegPath?.(ffmpegPath);
  }
}

function buildVideoFilters(
  scenes: SubtitleScene[],
  subtitleFiles: string[],
  template: ReelTemplate,
  duration: number,
  settings: RenderSettings,
  cinematicEnabled: boolean,
  retentionPlan: RetentionPlan
) {
  const subtitleY = textYExpression(template.textPosition);
  const fontFile = fontPath(template.fontStyle.weight);
  const fontOption = fontFile ? `fontfile='${fontFile}':` : "";
  const introTextFile = toFilterPath(subtitleFiles[subtitleFiles.length - 2]);
  const outroTextFile = toFilterPath(subtitleFiles[subtitleFiles.length - 1]);
  const style = safeTemplateStyle(template, settings);
  const filters = [
    buildBaseVideoFilter(template, cinematicEnabled),
    `color=c=black@0.0:s=${width}x${height}:d=1,format=rgba,geq=r='0':g='0':b='0':a='if(gt(Y,H*0.48),${style.bottomOpacity}*(Y-H*0.48)/(H*0.52),${style.topOpacity})'[grad]`,
    `[base][grad]overlay=0:0,format=yuv420p,fade=t=in:st=0:d=${style.fadeIn},fade=t=out:st=${Math.max(0, duration - style.fadeOut)}:d=${style.fadeOut}[v0]`,
    `[v0]drawtext=${fontOption}textfile='${introTextFile}':fontsize=${style.introFontSize}:fontcolor=${style.accentColor}:borderw=3:bordercolor=black@0.82:x=(w-text_w)/2:y=h*0.12:enable='between(t,0,${style.introDuration})'[vintro]`,
  ];

  let previousLabel = "vintro";

  scenes.forEach((scene, index) => {
    const nextLabel = `v${index + 1}`;
    const textFile = toFilterPath(subtitleFiles[index]);
    const impact = scene.isImpact;
    const boostScale = 1 + scene.retentionBoost;
    const emphasisScale =
      scene.emphasis === "hook" ? 1.08 : scene.emphasis === "final" ? 1.04 : 1;
    const fontSize = Math.round(
      clampNumber(
        (impact ? style.impactFontSize : style.fontSize) *
          boostScale *
          emphasisScale,
        36,
        108
      )
    );
    const fontColor = impact ? style.accentColor : style.fontColor;
    const borderWidth = clampNumber(
      (impact ? style.borderWidth + 1 : style.borderWidth) +
        Math.round(scene.retentionBoost * 3),
      0,
      10
    );
    filters.push(
      `[${previousLabel}]drawtext=${fontOption}textfile='${textFile}':fontsize=${fontSize}:fontcolor=${fontColor}:borderw=${borderWidth}:bordercolor=black@0.9:box=1:boxcolor=black@${style.boxOpacity}:boxborderw=24:line_spacing=${style.lineSpacing}:x=(w-text_w)/2:y=${subtitleY}:enable='between(t,${scene.start},${scene.end})'[${nextLabel}]`
    );
    previousLabel = nextLabel;
  });

  filters.push(
    `[${previousLabel}]drawtext=${fontOption}textfile='${outroTextFile}':fontsize=38:fontcolor=${style.accentColor}:borderw=2:bordercolor=black@0.75:x=(w-text_w)/2:y=h*0.82:enable='between(t,${Math.max(0, duration - retentionPlan.pacingProfile.ctaHold)},${duration})'[vout]`
  );

  return filters;
}

function safeTemplateStyle(template: ReelTemplate, settings: RenderSettings) {
  const sizeScale = subtitleSizeScale[settings.subtitleSize];
  const fontSize = Math.round(
    clampNumber(template.subtitleStyle.fontSize * sizeScale, 36, 92)
  );

  return {
    fontSize,
    impactFontSize: Math.round(clampNumber(fontSize * 1.1, 40, 102)),
    introFontSize: Math.round(
      clampNumber(template.subtitleStyle.fontSize * 0.82, 42, 72)
    ),
    fontColor: safeColor(template.subtitleStyle.fontColor, "FFFFFF"),
    borderWidth: clampNumber(template.subtitleStyle.borderWidth, 0, 8),
    boxOpacity: clampNumber(template.subtitleStyle.boxOpacity, 0, 0.75),
    lineSpacing: clampNumber(template.subtitleStyle.lineSpacing, 0, 28),
    bottomOpacity: clampNumber(template.overlayStyle.bottomOpacity, 0, 255),
    topOpacity: clampNumber(template.overlayStyle.topOpacity, 0, 255),
    fadeIn: clampNumber(template.transitionStyle.fadeIn, 0.05, 2),
    fadeOut: clampNumber(template.transitionStyle.fadeOut, 0.05, 2),
    introDuration: clampNumber(template.introStyle.duration, 0.2, 2.5),
    accentColor: safeColor(template.accentColor, "C7F542"),
  };
}

function buildBaseVideoFilter(
  template: ReelTemplate,
  cinematicEnabled: boolean
) {
  if (!cinematicEnabled) {
    return `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},format=rgba[base]`;
  }

  const motionProfile = safeMotionProfile(template.motionProfile);
  const polish = cinematicPolishFilter(template);

  if (motionProfile === "zoomIn") {
    return `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},zoompan=z='min(zoom+0.0009,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps},${polish},format=rgba[base]`;
  }

  if (motionProfile === "zoomOut") {
    return `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},zoompan=z='max(1.14-on*0.0009,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps},${polish},format=rgba[base]`;
  }

  if (motionProfile === "punchZoom") {
    return `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},zoompan=z='1+0.08*lt(mod(on,42),6)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps},${polish},format=rgba[base]`;
  }

  if (motionProfile === "slowPan") {
    return `[0:v]scale=1188:2112:force_original_aspect_ratio=increase,crop=${width}:${height}:x='(iw-${width})*(0.5+0.45*sin(t*0.18))':y='(ih-${height})*0.52',setsar=1,fps=${fps},${polish},format=rgba[base]`;
  }

  if (motionProfile === "subtleShake") {
    return `[0:v]scale=1120:1988:force_original_aspect_ratio=increase,crop=${width}:${height}:x='(iw-${width})/2+8*sin(t*18)':y='(ih-${height})/2+5*cos(t*21)',setsar=1,fps=${fps},${polish},format=rgba[base]`;
  }

  return `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},${polish},format=rgba[base]`;
}

function cinematicPolishFilter(template: ReelTemplate) {
  if (template.pacing === "fast") {
    return "eq=contrast=1.12:saturation=1.12,vignette=PI/5,noise=alls=3:allf=t";
  }

  if (template.pacing === "slow") {
    return "eq=contrast=1.08:saturation=0.94,vignette=PI/5,noise=alls=2:allf=t";
  }

  return "eq=contrast=1.05:saturation=1.04,vignette=PI/6,noise=alls=2:allf=t";
}

function safeMotionProfile(value: ReelTemplate["motionProfile"]) {
  return [
    "zoomIn",
    "zoomOut",
    "slowPan",
    "punchZoom",
    "subtleShake",
    "none",
  ].includes(value)
    ? value
    : "none";
}

function safeColor(value: string, fallback: string) {
  return /^[a-zA-Z]+$/.test(value) || /^[a-fA-F0-9]{6}$/.test(value)
    ? value
    : fallback;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

async function writeSubtitleFiles(
  directory: string,
  scenes: SubtitleScene[],
  template: ReelTemplate,
  settings: RenderSettings
) {
  const maxChars = settings.subtitleSize === "large" ? 18 : settings.subtitleSize === "small" ? 26 : 22;
  const subtitleFiles = await Promise.all(
    scenes.map(async (scene, index) => {
      const filePath = path.join(directory, `subtitle-${index}.txt`);
      await writeFile(filePath, sanitizeDrawtextText(wrapText(scene.text, maxChars)), "utf8");
      return filePath;
    })
  );

  const introPath = path.join(directory, "intro.txt");
  const outroPath = path.join(directory, "outro.txt");
  await writeFile(introPath, sanitizeDrawtextText(template.introStyle.text), "utf8");
  await writeFile(outroPath, sanitizeDrawtextText("RENDERED BY NOESAAID"), "utf8");

  return [...subtitleFiles, introPath, outroPath];
}

function textYExpression(position: ReelTemplate["textPosition"]) {
  if (position === "upper") {
    return "h*0.28";
  }

  if (position === "center") {
    return "(h-text_h)/2";
  }

  return "h*0.58";
}

function fontPath(weight: ReelTemplate["fontStyle"]["weight"]) {
  if (process.env.FFMPEG_FONT_PATH) {
    return toFilterPath(process.env.FFMPEG_FONT_PATH);
  }

  if (process.platform === "win32") {
    return weight === "regular"
      ? "C\\:/Windows/Fonts/arial.ttf"
      : "C\\:/Windows/Fonts/arialbd.ttf";
  }

  return weight === "regular"
    ? "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
}

async function writeFallbackBackground(directory: string) {
  const filePath = path.join(directory, "fallback-background.ppm");
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii");
  const row = Buffer.alloc(width * 3, 5);
  const pixels = Buffer.alloc(width * height * 3);

  for (let offset = 0; offset < pixels.length; offset += row.length) {
    row.copy(pixels, offset);
  }

  await writeFile(filePath, Buffer.concat([header, pixels]));
  return filePath;
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 2).join("\n");
}

function sanitizeDrawtextText(text: string) {
  return text
    .replace(/\\/g, "/")
    .replace(/:/g, " ")
    .replace(/'/g, "")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .slice(0, 220);
}

function toFilterPath(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.replace(/:/g, "\\:");
}
