# Tongue Twister Game — Project Specification

## Vision

A multilingual tongue twister game where players use their microphone to pronounce phrases as accurately as possible. The app validates pronunciation in real time, runs a game timer per round, and supports multiple languages across several countries. Works on all devices — desktop, tablet, and mobile — as a Progressive Web App.

---

## Core Features

### Speech Recognition
- Capture audio via the **MediaRecorder API** (universal browser/mobile support) streamed to **OpenAI Whisper API** for transcription
- Web Speech API used as a fast local fallback on Chrome/Edge desktop
- Compare the transcribed text against the target phrase using fuzzy string matching
- Accept the attempt only if accuracy meets the threshold (configurable per language)
- Reject and prompt the player to retry if pronunciation does not match — no score recorded

### Game Timer
- Each round has a **countdown timer** set per difficulty level:
  - Easy → 30 seconds
  - Medium → 20 seconds
  - Hard → 10 seconds
- Timer starts when the player presses the mic button
- Timer pauses during processing/validation
- If the timer reaches zero → round failed, no score saved
- Elapsed time at the moment of success is stored and used for ranking (faster = better rank)
- Visual timer bar animates in real time (color shifts green → orange → red as time runs out)

### Scoring System
- Score formula: `score = round(accuracy × 1000) + timeBonus`
  - `timeBonus = remaining_seconds × 10`
- Only successful attempts (accuracy ≥ threshold) are recorded
- Leaderboard per language, showing top scores with player name, phrase, accuracy, and time

### Language Support

| Language   | Country     | Script        |
|------------|-------------|---------------|
| French     | France      | Latin         |
| English    | USA / UK    | Latin         |
| Korean     | South Korea | Hangul        |
| Vietnamese | Vietnam     | Latin + tones |

The player selects a language at the start; the phrase library, UI labels, and speech recognition model switch accordingly.

---

## Technical Stack

### Frontend

| Concern            | Technology                                                          |
|--------------------|---------------------------------------------------------------------|
| Framework          | **React 19** — concurrent rendering, `use()`, Server Actions        |
| Build tool         | **Vite 6** — instant HMR, native ESM, Rollup 4 bundler             |
| Language           | **TypeScript 5.x** — strict mode                                    |
| Styling            | **Tailwind CSS v4** — CSS-first config, Lightning CSS compiler       |
| State              | **Zustand v5** — atomic, hook-based, zero boilerplate               |
| Routing            | **TanStack Router v1** — fully type-safe routes, file-based         |
| Data fetching      | **TanStack Query v5** — caching, background refetch, optimistic UI  |
| Speech capture     | **MediaRecorder API** → Whisper API (all devices/browsers)          |
| Speech fallback    | **Web Speech API** (Chrome/Edge only, instant local transcription)  |
| Animations         | **Motion (Framer Motion v12)** — spring physics, layout animations  |
| i18n               | **react-i18next** + **i18next-browser-languagedetector**            |
| PWA                | **vite-plugin-pwa** — offline cache, installable, app manifest      |
| Icons              | **Lucide React** — tree-shakeable SVG icons                         |
| Testing            | **Vitest** + **Playwright** for e2e                                 |

### Backend / API (this repo)

| Concern      | Technology                                                            |
|--------------|-----------------------------------------------------------------------|
| Runtime      | **Bun** — faster startup, built-in SQLite, native TypeScript support  |
| Framework    | **Hono.js** — ultra-fast, edge-ready, runs on Bun/Node/Cloudflare    |
| Validation   | **Zod** — schema validation on all request bodies                    |
| ORM          | **Drizzle ORM** — type-safe, SQL-like, zero magic                    |
| API docs     | **Scalar** (replaces Swagger UI) — modern OpenAPI 3.1 interface      |

### Database

| Environment  | Engine                                                                |
|--------------|-----------------------------------------------------------------------|
| Development  | **SQLite via Bun** — built-in, zero config                           |
| Production   | **Turso (LibSQL)** — distributed SQLite at the edge, HTTP API        |

---

## Database Schema

```sql
-- Phrases library
CREATE TABLE phrases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  language    TEXT NOT NULL,   -- 'fr', 'en', 'ko', 'vi'
  country     TEXT NOT NULL,   -- 'FR', 'US', 'KR', 'VN'
  text        TEXT NOT NULL,
  difficulty  TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  timer_s     INTEGER NOT NULL DEFAULT 20,  -- countdown seconds for this phrase
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scores per player per phrase
CREATE TABLE scores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase_id     INTEGER NOT NULL REFERENCES phrases(id),
  player_name   TEXT NOT NULL,
  elapsed_ms    INTEGER NOT NULL,  -- time from mic press to validation success
  accuracy      REAL NOT NULL,     -- 0.0 – 1.0
  score         INTEGER NOT NULL,  -- computed score
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Routes

| Method | Route               | Description                                      |
|--------|---------------------|--------------------------------------------------|
| GET    | `/phrases`          | List phrases — filter by `?lang=fr&difficulty=hard` |
| GET    | `/phrases/:id`      | Get a single phrase                              |
| POST   | `/phrases`          | Add a phrase (admin)                             |
| GET    | `/scores`           | Leaderboard — filter by `?lang=fr`               |
| POST   | `/scores`           | Submit a validated score                         |
| GET    | `/scores/top`       | Top 10 scores per language                       |

---

## Game Flow

```
1. Language Selection screen
        ↓
2. Difficulty Selection (easy / medium / hard)
        ↓
3. Phrase Display
   - Show the tongue twister text (large, readable)
   - Countdown timer bar (full, green)
   - "Hold to speak" mic button
        ↓
4. Recording
   - Microphone activates (MediaRecorder streams audio)
   - Countdown timer starts ticking
   - Animated waveform shown while listening
   - Live partial transcript shown below phrase (if Web Speech API available)
        ↓
5. Timer check (runs in parallel)
   └── Timer hits 0 → TIMEOUT
         - Mic stops
         - "Time's up!" animation
         - Return to step 3 (same phrase, retry)
        ↓
6. Validation (on mic release or silence detection)
   ├── Accuracy ≥ threshold → SUCCESS
   │     - Timer stops — elapsed time captured
   │     - Score calculated (accuracy + time bonus)
   │     - Celebration animation (confetti)
   │     - Prompt to save score (enter name)
   │     - POST /scores
   │
   └── Accuracy < threshold → FAILURE
         - "Try again" shake animation
         - Highlighted diff: correct vs spoken text
         - Timer resets
         - Return to step 4
        ↓
7. Leaderboard (after save or skip)
   - Top scores for current language
   - Option to play again or switch language
```

---

## Device & Platform Compatibility

The app is a **PWA (Progressive Web App)** — installable on all platforms with no app store required.

| Platform       | Audio Capture         | Speech Recognition       |
|----------------|-----------------------|--------------------------|
| Chrome desktop | MediaRecorder + WS API| Whisper + Web Speech API |
| Firefox desktop| MediaRecorder         | Whisper only             |
| Safari (iOS)   | MediaRecorder         | Whisper only             |
| Chrome Android | MediaRecorder + WS API| Whisper + Web Speech API |
| Samsung Browser| MediaRecorder         | Whisper only             |

**WS API** = Web Speech API (local, instant) | **Whisper** = cloud fallback (~1–2 s latency)

### Responsive Design
- Mobile-first layout with Tailwind breakpoints (`sm` / `md` / `lg`)
- Touch-optimized mic button (large tap target, haptic feedback via Vibration API)
- Keyboard accessible on desktop
- Safe-area insets for iOS notch / Android gesture bar
- Font sizes adapt to screen width using `clamp()`

---

## Folder Structure (planned)

```
tongue-twister-api/          ← this repo (backend)
├── src/
│   ├── routes/
│   │   ├── phrases.ts
│   │   └── scores.ts
│   ├── db/
│   │   ├── schema.ts        ← Drizzle schema
│   │   └── seed.ts
│   └── index.ts             ← Hono app entry
└── drizzle.config.ts

tongue-twister-app/          ← separate frontend repo
├── src/
│   ├── components/
│   │   ├── PhraseCard.tsx
│   │   ├── MicButton.tsx
│   │   ├── GameTimer.tsx    ← animated countdown bar
│   │   ├── Waveform.tsx
│   │   ├── ScoreBoard.tsx
│   │   └── LanguagePicker.tsx
│   ├── hooks/
│   │   ├── useSpeech.ts     ← MediaRecorder + Whisper + Web Speech API
│   │   └── useGameTimer.ts  ← countdown logic
│   ├── routes/              ← TanStack Router file-based routes
│   │   ├── index.tsx        ← Language selection
│   │   ├── game.tsx
│   │   └── leaderboard.tsx
│   ├── store/
│   │   └── gameStore.ts     ← Zustand
│   └── i18n/
│       ├── fr.json
│       ├── en.json
│       ├── ko.json
│       └── vi.json
├── public/
│   └── manifest.webmanifest ← PWA manifest
└── vite.config.ts
```

---

## Seed Data Examples

| Language   | Phrase                                                              | Difficulty | Timer |
|------------|---------------------------------------------------------------------|------------|-------|
| French     | "Un chasseur sachant chasser sait chasser sans son chien"           | hard       | 10s   |
| English    | "She sells seashells by the seashore"                               | medium     | 20s   |
| Korean     | "간장 공장 공장장은 강 공장장이고 된장 공장 공장장은 장 공장장이다"       | hard       | 10s   |
| Vietnamese | "Lúa nếp là lúa nếp nàng, lúa lên lớp lớp lòng nàng lúa ơi"      | medium     | 20s   |

---

## Milestones

| # | Milestone                          | Deliverables                                                   |
|---|------------------------------------|----------------------------------------------------------------|
| 1 | Backend foundations                | Bun + Hono setup, Drizzle schema, seed data, phrases + scores routes, Scalar docs |
| 2 | Frontend scaffold                  | Vite + React 19 + Tailwind v4, TanStack Router, i18n, PWA manifest |
| 3 | Speech integration                 | MediaRecorder → Whisper pipeline, Web Speech API fallback, waveform display |
| 4 | Game timer                         | Countdown bar component, timeout handling, timer/score logic   |
| 5 | Validation & scoring               | Fuzzy match, success/failure states, score POST                |
| 6 | Leaderboard & language selector    | Top scores page, language/country filter, difficulty filter    |
| 7 | Polish & cross-device testing      | Animations, haptic feedback, iOS/Android/Firefox QA            |
| 8 | Deploy                             | Turso DB, Hono on Cloudflare Workers, frontend on Vercel       |
