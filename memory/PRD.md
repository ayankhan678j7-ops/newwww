# PRD - JARVIS AI

## Overview
JARVIS AI is a Play-Store-compliant Android AI companion built with Expo + FastAPI + MongoDB. **42 specialized expert assistants**, each with unique advanced system prompts, personality, workflow, welcome message, placeholder, and suggestions. Shared JARVIS design language; isolated per-assistant memory (with global memories layered on top).

## Tech Stack
- **Frontend**: Expo Router (React Native, TS), reanimated, expo-audio, expo-blur, expo-haptics, expo-linear-gradient
- **Backend**: FastAPI, Motor (MongoDB), httpx, passlib[bcrypt]
- **AI**: Sarvam AI (`sarvam-105b` chat + streaming, `bulbul:v2` TTS, `saarika:v2.5` STT)
- **Search**: Tavily
- **Auth**: Guest, Email + Password (bcrypt + brute-force throttle), Firebase Google Sign-In (native build)

## Iteration 2 upgrades
1. **Search bar** — sticky at the top of Home with mic + clear button
2. **Streaming chat** — `/api/chat/stream` NDJSON → client fetch-reader → token-by-token typing with cursor, "Generating…" indicator, Stop button (aborts fetch), graceful fallback to non-streaming
3. **Retry logic** — `http_with_retry` for Sarvam + Tavily (1s → 2s → 4s), only on 5xx / network / timeout, never on 4xx
4. **42 expert assistants** — each has (a) rich advanced system prompt, (b) unique welcome + placeholder + 3-4 suggestions, (c) unique icon + accent color, (d) disclaimers where required (health/finance/legal), (e) isolated memory scope
5. **Memory isolation** — `POST /api/memory` accepts `assistant_id` (null = global); chat only injects memories matching the current assistant or global
6. **Email + Password auth** — signup, signin, throttle after 5 failures for 15 minutes; bcrypt via passlib; constant-time verify for user-existence privacy
7. **Static pages** — Privacy Policy, Terms & Conditions, Rate & Review (writes to `/api/ratings`)
8. **Firebase config** — `google-services.json` bundled at `/app/frontend/google-services.json`; activates in a native build after Publish

## Test results (iteration 2)
- **Backend: 20/20 pytest PASSED** (auth signup/signin/throttle, guest, google, /me, logout, delete, chat, streaming NDJSON, streaming+citations, memory isolation, ratings, TTS)
- **Frontend**: search bar visible, streaming with stop verified, 42 assistants show unique welcome + suggestions, Rate/Privacy/Terms pages render

## Google Play compliance
- No auto-send / auto-call / recording / background monitoring
- Health/Finance/Legal are strictly informational with disclaimers
- Communication assistant only DRAFTS; user shares via native intent
- Mic permission requested contextually
- Full account deletion + memory wipe

## Future
- Attach real PDFs/images (currently paste text)
- Native Google Sign-In click-through (after build)
- Push notifications (after user requests)
