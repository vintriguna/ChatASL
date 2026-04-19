@AGENTS.md

# CLAUDE.md

## Project

This is a CitrusHack 2026 project: a Next.js web app that helps users learn American Sign Language.

The app is focused on ASL letter recognition for a hackathon MVP, not full ASL sentence translation.

## Main Modes

1. Practice Mode — freeform, infinite, tracks attempts via `/api/attempts`
2. Quiz Mode — 5-letter sessions, saved to `sessions` + `attempts` tables via `/api/sessions`
3. Learn Mode — shows Wikimedia Commons SVG reference images alongside webcam (`/learn/play`)
4. Translate Mode — confirm-before-add flow, accumulates text, has Speak (Web Speech API) button
5. Spell Mode — linked from home, page exists at `/spell`

## Database Schema (Supabase)

Tables: `sessions`, `attempts`, `letter_stats`, `user_streaks`

- `letter_stats` — per-user per-letter correct/incorrect counts, updated via `increment_letter_stats` RPC
- `user_streaks` — current and longest streak, updated via `update_streak` RPC (fires on any attempt or session save)
- All tables have RLS enabled; users can only access their own rows

## ML / Inference Assumptions

We do not want to train a model from scratch during the hackathon.

Prefer:

- existing hosted ASL recognition APIs
- Roboflow or similar hosted inference
- browser or API-based inference that can work quickly with a Next.js app

If real inference is blocked, create a clean mock/fallback layer so the rest of the product can still be demoed.

## Scope Rules

Prioritize a working demo over ambitious scope.

Do:

- build a reliable webcam flow
- get predictions showing in the UI
- make Practice Mode work well
- make Translate Mode work well
- keep the UI simple and demo-friendly

Do not:

- attempt full ASL language translation
- overengineer backend infrastructure
- spend hackathon time on training pipelines unless absolutely necessary

## Tech Preferences

- Next.js
- TypeScript
- clean, simple React components
- minimal dependencies
- readable code over clever abstractions

## How to Work in This Repo

When planning or implementing:

- first understand the existing code structure
- make incremental changes, not large rewrites
- prefer the fastest path to a working end-to-end demo
- call out blockers early
- suggest hackathon-friendly fallbacks when needed

## UX Expectations

The app should feel clear and easy to demo.

Prefer:

- a simple landing page
- obvious entry points to Practice Mode and Translate Mode
- large webcam and prediction UI
- fast feedback
- minimal clutter

## Vercel Deployment Notes

- **Root Directory must be set to `chat-asl`** in the Vercel project dashboard — the repo root contains other folders and Vercel will fail to resolve modules otherwise
- The proxy file is `proxy.ts` (not `middleware.ts`) — Next.js 16 renamed the convention; the function export must be named `proxy`
- `@supabase/ssr` must not be imported in `proxy.ts` — it uses Node.js APIs incompatible with the Edge Runtime; use a cookie presence check instead
- `serverExternalPackages: ["ua-parser-js"]` is set in `next.config.ts` to prevent a bundled Next.js dependency from crashing the Edge Runtime
- Roboflow API key is hardcoded in `/api/predict/route.ts` — should be moved to `.env.local` before any public exposure

## Output Style

When helping in this repo:

- be practical and direct
- keep plans short and concrete
- prioritize implementation steps that improve demo readiness
- clearly separate MVP features from stretch ideas
