@AGENTS.md

# CLAUDE.md

## Project

This is a CitrusHack 2026 project: a Next.js web app that helps users learn American Sign Language.

The app is focused on ASL letter recognition for a hackathon MVP, not full ASL sentence translation.

## Main Modes

1. Practice Mode

- Show the user a target letter
- Use webcam input to detect the signed letter
- Compare prediction to target
- Give simple feedback: correct/incorrect, detected letter, confidence if available

2. Translate Mode

- Let the user sign letters one at a time
- Convert predictions into text output
- Support simple controls like add letter, delete, clear, and optional text-to-speech

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

## Output Style

When helping in this repo:

- be practical and direct
- keep plans short and concrete
- prioritize implementation steps that improve demo readiness
- clearly separate MVP features from stretch ideas
