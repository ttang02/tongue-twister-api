# Tongue Twister — Claude Code Guide

Multilingual tongue-twister game. Players pronounce phrases into the mic; the app transcribes with the Web Speech API, validates word-by-word (Jaro-Winkler), and awards a score based on accuracy and time. Supports French, English, Korean, and Vietnamese.

## Monorepo layout

```
tongue-twister-api/
├── api/        Elysia.js v1 backend (Node.js 18+ via tsx)
└── app/        React 19 frontend (Vite 6 + TypeScript 5 + Tailwind v4)
```

## Essential commands

```bash
# First-time setup (from root)
npm run setup          # install deps + migrate DB + seed 84 phrases

# Development (from root — starts both API and app in parallel)
npm run dev

# Individual
npm run dev:api        # API only (port 3000)
npm run dev:app        # app only (port 5173)

# Build (app only — API runs via tsx, no build step)
cd app && npm run build       # tsc -b (typecheck) + vite build

# Typecheck
cd app && npx tsc -b          # frontend typecheck
cd api && npm run typecheck   # API typecheck

# Database (from api/)
npm run db:generate    # generate Drizzle migrations
npm run db:migrate     # apply migrations
npm run db:seed        # insert the 84 seed phrases
npm run db:studio      # open Drizzle Studio
```

## Environment variables

**`api/.env`**
```
DATABASE_URL=file:./dev.db
TURSO_AUTH_TOKEN=              # leave empty in dev
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**`app/.env`**
```
VITE_API_URL=http://localhost:3000
```

## Tech stack

| Layer | Tech |
|---|---|
| Frontend framework | React 19, Vite 6, TypeScript 5 |
| Styling | Tailwind CSS v4 (no config file — uses CSS `@theme`) |
| Animation | Motion v12 (Framer Motion) |
| Routing | TanStack Router v1 (file-based, `src/routes/`) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 — **no immer**, plain `set`/`get` only |
| i18n | react-i18next, locale files in `app/src/i18n/*.json` |
| PWA | vite-plugin-pwa + Workbox |
| Backend | Elysia.js v1.4 + `@elysiajs/node` adapter (Node.js, NOT Bun) |
| Validation | TypeBox (native Elysia) |
| ORM | Drizzle ORM + `@libsql/client` |
| DB | SQLite (file) in dev · Turso LibSQL in prod |
| Speech-to-text | **Web Speech API** only — Chrome and Edge only, no API key |
| Text-to-speech | Web Speech API (fr/en/ko) + Google Translate TTS server proxy (vi) |

## Architecture notes

### Game state machine (`app/src/store/gameStore.ts`)

The store uses a `phase` discriminant:
`language_select` → `difficulty_select` → `phrase_display` → `recording` → `processing` → `success` / `timeout` / `failed`

Key fields: `language`, `difficulty`, `phrase`, `accuracy`, `score`, `sessionScore`, `sessionCount`, `sessionStreak`.

### Stale-closure patterns

Three ref patterns prevent stale closures across the codebase:

- **`liveRef`** (`useSpeech.ts`) — mirrors `liveTranscript` state so `stop()` can read the current transcript without capturing a stale closure.
- **`onTimeoutRef`** (`useGameTimer.ts`) — stores the latest `onTimeout` callback so the rAF loop never captures a stale version.
- **`handleStopRef` / `handleStartRef`** (`game.tsx`) — store the latest versions of handlers passed into timeouts.

### Accuracy (`app/src/hooks/useAccuracy.ts`)

1. Normalize both transcript and target (remove accents, lowercase, expand compound words).
2. Compute Jaro-Winkler similarity per word pair using dynamic programming alignment.
3. Return a `[0, 1]` accuracy score + per-word state (correct / close / wrong / extra / missing).

Accuracy thresholds by language: `fr: 0.72`, `en: 0.75`, `ko: 0.68`, `vi: 0.65`.

### API error handling

Elysia v1 exposes `status()` (not `error()`) in the handler context:
```ts
// Correct in Elysia v1
.get('/path', ({ status }) => status(404, { error: 'Not found' }))

// Wrong — error is not a context property
.get('/path', ({ error }) => error(404, ...))  // TS error
```

### TTS proxy

`GET /speech/tts?text=...&lang=vi` proxies to Google Translate TTS to bypass CORS. Rate-limited to 60 req/min per IP. The client uses Web Speech API directly for fr/en/ko (no server request).

### Scoring formula

```
score = round((accuracy * 1000 + remaining_seconds * 10) * DIFF_MULTIPLIER)
```
Multipliers: easy ×1.0, medium ×1.5, hard ×2.5. Server recalculates to prevent cheating.

## Browser requirements

Speech recognition requires **Chrome or Edge** (desktop or mobile). Firefox and Safari do not support the Web Speech API. The app shows a graceful error for unsupported browsers.

## Key files

| File | Purpose |
|---|---|
| `app/src/routes/game.tsx` | Main game loop — all phases, mic, timer, TTS, score saving |
| `app/src/hooks/useSpeech.ts` | Web Speech API wrapper with stale-closure-safe `stop()` |
| `app/src/hooks/useGameTimer.ts` | rAF countdown, pause/resume, haptic at 5 s remaining |
| `app/src/hooks/useAccuracy.ts` | Jaro-Winkler word accuracy with compound expansion |
| `app/src/store/gameStore.ts` | Zustand state machine |
| `api/src/routes/scores.ts` | Score submission with server-side recalculation + dedup |
| `api/src/db/seed.ts` | 84 seed phrases across 4 languages × 3 difficulties |

## Common gotchas

- **Tailwind v4** uses `@theme { --color-*: ... }` inside `index.css`, not `tailwind.config.js`. CSS variables are declared with the `p` (primary) prefix: `rgb(var(--p))`.
- **`noUncheckedIndexedAccess`** is enabled — array/record accesses return `T | undefined`. Use `!` or null-checks.
- **TanStack Router** generates `src/routeTree.gen.ts` on dev server start — this file is gitignored and must not be edited manually.
- **Drizzle `.limit()` / `.offset()`** do not accept `undefined` — always pass a number (`limit ?? 20`).
- **`'share' in navigator`** narrows the else branch to `never` in TypeScript (DOM lib types `share` as always-present). Use `typeof navigator.share === 'function'` instead.
- The app store uses **Zustand v5 plain API** — `useStore(s => s.field)`, `useStore.getState().action()`, `useStore.setState({...})`. No `immer` middleware.
