# MVP Status

NoesaaID Reels Engine is integration-ready for local-first MVP use. The current build supports AI script generation, batch concepts, local asset selection, reusable templates, render settings, FFmpeg MP4 export, and secure local downloads.

## Completed Milestones

- Rebranded the app to NoesaaID Reels Engine.
- Refactored the app into a general-purpose short-form video engine.
- Added presets with NeedSport as the first niche preset.
- Added single AI generation through MiMo.
- Added batch generation for 3, 5, and 10 concepts.
- Added local asset listing for footage and music.
- Added optional selected footage/music rendering.
- Added FFmpeg-only vertical MP4 renderer.
- Added reusable video templates.
- Added render settings for duration, subtitle size, and quality.
- Added lightweight local Retention Engine scoring for pacing, emphasis, rhythm, and CTA timing.
- Added Clip Generator MVP for local source videos.
- Added multi-file upload workflow for Clip Generator source videos.
- Added secure download route for generated MP4 files.
- Added localStorage history capped to the last 10 generations.
- Added TXT and JSON exports.

## Current Verified Capabilities

- `npm.cmd run build` passes.
- Single generation returns `{ success, result }`.
- Batch generation returns `{ success, results }`.
- Invalid batch counts safely fall back to single generation.
- Invalid render settings safely fall back to standard defaults.
- Invalid template IDs safely fall back to the default template.
- Retention planning safely falls back to a neutral plan if scoring fails.
- Rendered MP4 files are saved under `outputs/`.
- Download route returns `video/mp4` for valid generated filenames.
- Download route rejects traversal and invalid filenames.
- Renderer works with selected assets and fallback assets.
- Renderer exposes retention metadata including scroll-stop score, dopamine beats, loop ending hint, subtitle emphasis plan, and scene composition hints.
- Clip analysis creates deterministic short-form candidates from local source video duration.
- Clip upload saves supported videos under `assets/footage/uploads/`.
- Clip rendering cuts local source videos into 1080x1920 MP4 outputs.

## Known Acceptable Risks

- Render requests are synchronous and can tie up the local process while FFmpeg runs.
- Clip render requests are synchronous and can tie up the local process while FFmpeg runs.
- Retention scoring is heuristic and lightweight; it does not replace manual creative review.
- Clip scoring is duration-based only; speech-to-text/transcript detection is not implemented yet.
- There is no background queue or retry system yet.
- Output cleanup is manual.
- Large scripts can increase render time and produce dense subtitles.
- Browser localStorage history is device/browser-specific.
- FFmpeg and ffprobe must be available on the host machine path.

## Next Recommended Roadmap

1. Stabilize MVP documentation and operating notes.
2. Add a browser preview player and render library view.
3. Add a lightweight local batch render queue when synchronous rendering becomes limiting.
4. Expand preset packs for multiple niches and brands.
5. Prepare VPS deployment notes and filesystem cleanup rules.
6. Defer SaaS features until the local-first engine is proven.

## Local-First Deployment Notes

- Keep assets in `assets/footage/` and `assets/music/`.
- Keep source videos for Clip Generator in `assets/footage/`, `assets/footage/uploads/`, or reuse safe local MP4s from `outputs/`.
- Keep generated MP4 files in `outputs/`.
- Run with Node.js and FFmpeg installed on the same machine.
- Use `npm.cmd run build` before deployment.
- Use `npm.cmd run start` for production-like local serving after build.
- Mount persistent storage for `assets/` and `outputs/` on VPS.
- Avoid adding external infrastructure until render volume requires it.
