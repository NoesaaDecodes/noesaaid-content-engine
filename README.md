# NoesaaID Reels Engine

NoesaaID Reels Engine is a local-first AI short-form video engine built with Next.js 16, TypeScript, Tailwind, MiMo API, and FFmpeg. The current MVP generates short-form scripts, renders vertical MP4 reels from templates, and serves completed videos through a safe local download route.

The engine is general-purpose. NeedSport is included only as the first niche preset for football, futsal, jersey, and matchday-style content.

## Features

- Single AI reel generation.
- Batch generation for 3, 5, or 10 reel concepts.
- Preset system for niche-specific prompts and defaults.
- Local asset manager for footage and music.
- Template system for FFmpeg-only visual styles.
- Render settings for duration, subtitle size, and quality.
- 1080x1920 vertical MP4 rendering with subtitles.
- Secure MP4 download route restricted to generated output files.
- Browser-only localStorage generation history capped to the last 10 items.
- Export generated concepts as TXT or JSON.

## Local Setup

Install dependencies:

```powershell
npm.cmd install
```

Create `.env.local` in the project root:

```env
MIMO_API_KEY=your_mimo_api_key
MIMO_BASE_URL=your_mimo_openai_compatible_base_url
MIMO_MODEL=mimo-v2.5-pro
```

Install FFmpeg locally and make sure `ffmpeg` and `ffprobe` are available from PowerShell:

```powershell
ffmpeg -version
ffprobe -version
```

## Environment Variables

- `MIMO_API_KEY`: required for AI generation.
- `MIMO_BASE_URL`: required MiMo OpenAI-compatible API base URL.
- `MIMO_MODEL`: optional, defaults to `mimo-v2.5-pro`.

## Folder Structure

```text
app/
  api/
    assets/
    generate-script/
    render-reel/
  lib/
    ffmpeg/
    presets/
    render-settings/
    templates/
  page.tsx
assets/
  footage/
  music/
outputs/
docs/
```

Important modules:

- `app/api/generate-script/route.ts`: single and batch AI generation.
- `app/api/assets/route.ts`: local media asset listing.
- `app/api/render-reel/route.ts`: FFmpeg render API.
- `app/api/render-reel/file/[filename]/route.ts`: secure MP4 download route.
- `app/lib/ffmpeg/renderer.ts`: vertical MP4 render pipeline.
- `app/lib/presets/index.ts`: general-purpose preset definitions.
- `app/lib/templates/index.ts`: reusable video templates.
- `app/lib/render-settings/index.ts`: render option defaults and validation.

## Add Local Assets

Put optional background footage in:

```text
assets/footage/
```

Allowed footage extensions:

```text
.mp4, .mov, .webm
```

Put optional music in:

```text
assets/music/
```

Allowed music extensions:

```text
.mp3, .wav, .m4a, .aac
```

If no footage is selected or available, the renderer falls back to a generated black background. If no music is selected or available, the renderer exports a silent MP4.

## Run Development

```powershell
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

## Build

```powershell
npm.cmd run build
```

## Render Workflow

1. Choose a preset.
2. Enter a topic, category, platform, and tone.
3. Generate a single concept or batch concepts.
4. Optional: choose local footage/music.
5. Choose a video template.
6. Choose render settings.
7. Click `Render Reel`.
8. Download the generated MP4 from the success card.

Generated videos are saved to:

```text
outputs/
```

## Current Limitations

- Rendering is synchronous and local to the running Next.js process.
- There is no queue, worker, Redis, database, auth, cloud upload, or SaaS account layer.
- Preview is UI-level only; the renderer writes final MP4 files.
- Long scripts can increase render time and reduce subtitle readability.
- Asset management is filesystem-only.
- Output cleanup is manual for now.

## Copyright-Safe Workflow

- Use owned, licensed, or self-produced footage and music.
- Do not claim affiliation with brands, clubs, players, creators, or organizations unless explicitly authorized.
- Keep presets and prompts niche-specific without hardcoding copyrighted media assumptions into the renderer.
- Treat the renderer as a template-based production tool, not an AI video generator.
- Review generated captions, scripts, and hashtags before publishing.
