# Developer Handoff

This project is a lightweight, local-first AI short-form video engine. The core engine should remain general-purpose. Niche behavior belongs in presets, not in the renderer.

## Architecture Overview

- Next.js 16 app router handles the UI and API routes.
- MiMo API generates structured reel concepts.
- Zod validates API inputs.
- FFmpeg CLI, through `fluent-ffmpeg`, renders vertical MP4 files.
- A lightweight Retention Engine computes heuristic pacing and emphasis hints before FFmpeg render.
- Clip Generator analyzes local source videos with ffprobe and creates duration-based short-form candidates.
- Local filesystem stores source assets and generated outputs.
- Browser localStorage stores lightweight generation history.

## API Routes

- `GET /api/assets`
  - Lists safe local footage and music files.
  - Reads from `assets/footage/` and `assets/music/`.
  - Allows only approved media extensions.

- `POST /api/generate-script`
  - Accepts `presetId`, `topic`, `category`, `platform`, `tone`, and optional `batchCount`.
  - `batchCount` supports `1`, `3`, `5`, and `10`.
  - Returns `{ success, result }` for single generation.
  - Returns `{ success, results }` for batch generation.

- `POST /api/render-reel`
  - Accepts generated reel content plus optional `footageFile`, `musicFile`, `templateId`, `durationMode`, `subtitleSize`, and `quality`.
  - Validates selected asset names against files returned by the asset manager.
  - Falls back to default template and render settings when needed.
  - Writes MP4 output to `outputs/`.

- `POST /api/clips/analyze`
  - Accepts `sourcePath`, `platform`, `maxClips`, and optional `targetDuration`.
  - Allows only local source videos from `assets/footage/` and `outputs/`.
  - Uses ffprobe duration metadata and deterministic heuristics.
  - Does not render output.

- `POST /api/clips/generate`
  - Accepts `sourcePath`, optional `platform`, and optional `maxClips`.
  - Reuses clip analysis and FFmpeg clipping.
  - Renders top candidates sequentially, defaulting to 3 clips with a hard cap of 5.
  - Continues rendering remaining clips if one candidate fails.

- `POST /api/clips/upload`
  - Accepts multipart video uploads using the `files` field.
  - Allows `.mp4`, `.mov`, `.mkv`, and `.webm`.
  - Saves safe generated filenames under `assets/footage/uploads/`.
  - Returns uploaded file metadata and per-file errors.

- `POST /api/clips/render`
  - Accepts `sourcePath` and a selected clip candidate.
  - Validates source path and candidate timing.
  - Cuts the source video into a vertical MP4 under `outputs/`.
  - Keeps clipping synchronous.

- `GET /api/render-reel/file/[filename]`
  - Serves generated reel and clip MP4 files only.
  - Rejects traversal, invalid names, and non-MP4 output access.

## Core Modules

- `app/lib/mimo.ts`
  - OpenAI-compatible MiMo client.

- `app/lib/presets/index.ts`
  - Preset definitions.
  - Presets define prompt behavior, default topic, categories, platforms, tones, visual style, and default hashtags.
  - NeedSport belongs here as an example niche preset.

- `app/lib/templates/index.ts`
  - Template definitions for FFmpeg render styling.
  - Templates control subtitle style, overlay style, font style, intro/outro, transitions, text position, accent color, and pacing.

- `app/lib/render-settings/index.ts`
  - Defines supported render options and safe defaults.
  - Duration modes: `short`, `medium`, `long`.
  - Subtitle sizes: `small`, `medium`, `large`.
  - Quality modes: `draft`, `standard`, `high`.

- `app/lib/retention/index.ts`
  - Exports the local-first Retention Engine.
  - Produces `scrollStopScore`, `pacingProfile`, `dopamineBeats`, `loopFriendlyEnding`, `subtitleEmphasisPlan`, and `sceneCompositionHints`.
  - Uses safe fallback planning so FFmpeg rendering can continue if scoring fails.

- `app/lib/clips/index.ts`
  - Exports the Clip Generator engine.
  - Produces candidate windows, scores, hooks, captions, hashtags, visual plans, and retention metadata.
  - Uses duration-based heuristics only; transcript/STT support is a future extension.

- `app/lib/ffmpeg/assets.ts`
  - Asset directory helpers.
  - Safe filename and extension validation.
  - Safe source-video path resolution for `assets/footage/` and `outputs/`.
  - Creates `assets/footage/uploads/` for Clip Generator uploads.

- `app/lib/ffmpeg/clipper.ts`
  - FFmpeg clip cutter.
  - Converts selected source ranges into 1080x1920 MP4 output.
  - Preserves audio when available.

- `app/lib/ffmpeg/subtitles.ts`
  - Script-to-subtitle scene splitting and timing.
  - Applies retention pacing hints to hook, body, and final subtitle durations.

- `app/lib/ffmpeg/renderer.ts`
  - FFmpeg render pipeline.
  - Keeps rendering niche-agnostic.
  - Applies retention subtitle emphasis and CTA timing without changing the synchronous architecture.

## Presets, Templates, and Settings

Presets are content strategy inputs. They should shape AI generation only.

Templates are render style inputs. They should shape FFmpeg output only.

Render settings are user-controlled quality and pacing inputs. They should remain a small, validated set of options.

Do not mix these layers. For example, do not hardcode football, futsal, crypto, or motivation logic inside the renderer.

## Safety Rules

- Only serve files from `outputs/` through the download route.
- Only allow generated MP4 filenames matching the route pattern.
- Only render selected assets that are returned by the asset manager.
- Only analyze and clip source videos from `assets/footage/` or `outputs/`.
- Only save uploaded source videos to `assets/footage/uploads/`.
- Keep drawtext input escaped and file-based.
- Keep retention logic optional and fallback-safe.
- Keep script and line counts bounded.
- Keep all filesystem paths resolved through server-side helpers.
- Use fallback behavior for missing assets, invalid templates, and invalid render settings.

## Coding Constraints

- Preserve Windows support.
- Use `npm.cmd` commands in PowerShell.
- Keep the app local-first and VPS-friendly.
- Keep code production-readable and simple.
- Use structured validation for API inputs.
- Keep reusable logic in `app/lib/`.
- Read local Next.js docs under `node_modules/next/dist/docs/` before changing Next.js-specific behavior.

## What Not To Add Yet

- Do not add a database.
- Do not add auth.
- Do not add Redis.
- Do not add queues or workers.
- Do not add WebSockets.
- Do not add cloud storage.
- Do not add payment.
- Do not add SaaS tenancy.
- Do not add GPU or complex animation engines.

These may become relevant later, but they are intentionally outside the current MVP.
