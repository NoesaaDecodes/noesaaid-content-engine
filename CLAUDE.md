# NoesaaID Content Engine — Claude Code Instructions

## Project
- Name: NoesaaID Content Engine
- Path: C:\NeedSportAI\needsport-ai-reels
- Repo: github.com/NoesaaDecodes/noesaaid-content-engine (private)
- Stack: Next.js 16, TypeScript, Tailwind, FFmpeg, faster-whisper, MiMo API
- Node: npm run dev | npm run lint | npm run build

## Architecture Rules (NEVER violate)
- local-first, FFmpeg-only, Windows-compatible
- No database, no auth, no Redis, no cloud storage, no GPU
- No SaaS features, no billing, no multi-tenant
- Synchronous rendering is acceptable for MVP

## MiMo API
- Base URL: https://token-plan-sgp.xiaomimimo.com/v1 (OpenAI protocol)
- Model: mimo-v2.5-pro
- Key: in .env.local as MIMO_API_KEY
- Pattern: see app/lib/mimo.ts

## Key Files — Read only what's needed
- Clip engine: app/lib/clips/clip-engine.ts
- FFmpeg render: app/lib/ffmpeg/clipper.ts
- STT: app/lib/stt/transcriber.ts + scripts/transcribe.py
- Platforms: app/lib/platforms.ts
- Languages: app/lib/languages.ts
- Studio UI: app/studio/[clipId]/studio-client.tsx
- Main UI: app/components/viral-clip-studio.tsx

## Storage
- Uploads: assets/footage/uploads/
- Outputs: outputs/
- Transcripts: outputs/transcripts/[hash].json
- Fonts: assets/fonts/Montserrat-Bold.ttf, Montserrat-ExtraBold.ttf
- History: localStorage "noesaaid_history" (max 10)
- Settings: localStorage "noesaaid_settings"
- Studio data: sessionStorage "noesaaid_studio_[clipId]"

## API Routes
- Upload: POST /api/clips/upload
- Analyze: POST /api/clips/analyze
- Generate: POST /api/clips/generate
- Transcribe: POST /api/clips/transcribe
- Assets list: GET /api/assets/list
- Studio render: POST /api/studio/render
- Studio generate: POST /api/studio/generate
- Studio transcript: GET /api/studio/transcript

## DO NOT TOUCH (unless explicitly told)
- app/api/clips/* — all clip routes
- app/lib/clips/* — clip engine
- app/lib/stt/* — STT layer
- scripts/transcribe.py — Python STT script
- app/lib/platforms.ts
- app/lib/languages.ts
- .env.local

## Before Every Task
1. Run: npm run lint && npm run build (confirm baseline clean)
2. Read ONLY the specific files needed for the task
3. Do not read all files blindly

## After Every Task
1. Run: npm run lint && npm run build
2. Fix all errors before reporting done
3. Never commit unless explicitly told to commit

## FFmpeg Notes
- Windows path format: C\:/path/to/file (backslash before colon)
- Font path: use toFFmpegPath(path.join(process.cwd(), 'assets/fonts/...'))
- Emoji must be stripped before passing to drawtext
- Caption safe margin: x='max(60,(w-text_w)/2)'
- Output always scale+pad (never crop content)

## Current Phase Status
- Phase 1 ✅ commit ee6eae3 — Opus UI + sidebar + pages
- Phase 2 ✅ commit a7f6f4e — STT + captions + platform picker
- Phase 3 🔄 in progress — Studio page (not committed yet)

## Benchmark
- OpusClip, Vizard AI
- North star: "Upload once. Generate viral-ready shorts."@AGENTS.md
