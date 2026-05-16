# Roadmap

This roadmap keeps NoesaaID Reels Engine local-first while leaving room for future production growth. SaaS architecture is intentionally later, not now.

## Phase 1: MVP Stabilization

- Keep single generation stable.
- Keep batch generation stable.
- Keep local asset manager stable.
- Keep templates and render settings simple.
- Keep the Retention Engine heuristic, local-first, and FFmpeg-only.
- Keep download route locked to generated MP4 files.
- Document setup, handoff, and known limits.
- Add only small reliability fixes when they protect the current MVP.

## Phase 2: Preview Player and Render Library

- Keep Clip Generator MVP local-first with duration-based segmentation.
- Add a browser video preview for completed MP4 files.
- Add a local render library view for recent outputs.
- Show render metadata such as template, duration mode, quality, asset names, and created time.
- Optionally show retention metadata such as scroll-stop score and loop-friendly ending.
- Add a simple manual delete action for generated outputs.
- Keep storage filesystem-only.
- Add transcript-aware clip selection later, after the duration-based MVP is stable.

## Phase 3: Batch Render Queue

- Add a lightweight local queue only when synchronous rendering becomes painful.
- Start with in-process queueing before considering external services.
- Track pending, rendering, completed, and failed states.
- Keep queue state local and simple.
- Avoid Redis/workers until deployment volume proves the need.

## Phase 4: Multi-Brand Preset Packs

- Add more general-purpose and niche preset packs.
- Keep presets isolated from renderer logic.
- Support brand voice, content goals, default hashtags, and category sets.
- Keep templates reusable across brands.
- Treat NeedSport as one example preset, not the core product identity.

## Phase 5: VPS Deployment

- Document Node.js, FFmpeg, storage, and process manager requirements.
- Mount persistent folders for `assets/` and `outputs/`.
- Add output cleanup policy.
- Add operational checks for FFmpeg and ffprobe.
- Keep deployment single-server and filesystem-first.

## Phase 6: SaaS Later, Not Now

- Consider auth only after local-first workflows are proven.
- Consider database only when users, projects, or persistent render metadata require it.
- Consider object storage only when VPS disk storage becomes limiting.
- Consider Redis/workers only when render concurrency requires it.
- Consider billing only after the core engine has repeatable usage.
