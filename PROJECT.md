# Tongue Twister Game — Project Specification

## Vision

A multilingual tongue twister game where players use their microphone to pronounce phrases as accurately as possible. The app validates pronunciation in real time, tracks scores and completion times, and supports multiple languages across several countries.

---

## Core Features

### Speech Recognition
- Capture audio input via the **Web Speech API** (`SpeechRecognition`) or a wrapper library (e.g. `react-speech-recognition`)
- Compare the recognized text against the target tongue twister phrase
- Accept the attempt only if the recognized text matches the phrase (partial tolerance configurable per language)
- Reject and prompt the player to retry if pronunciation does not match

### Scoring System
- Points awarded based on:
  - **Accuracy** — how closely the spoken text matches the target phrase
  - **Speed** — time elapsed from start to successful recognition
- A countdown or stopwatch is displayed during each attempt
- No score is recorded for failed attempts
- Leaderboard per language/country

### Language Support

| Language   | Country     | Script        |
|------------|-------------|---------------|
| French     | France      | Latin         |
| English    | USA / UK    | Latin         |
| Korean     | South Korea | Hangul        |
| Vietnamese | Vietnam     | Latin + tones |

The player selects a language at the start; the phrase library and UI labels switch accordingly.

---

## Technical Stack

### Frontend — React
- **Framework**: React 18+ with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State management**: Zustand (lightweight, no boilerplate)
- **Routing**: React Router v6
- **Speech**: `react-speech-recognition` (wrapper around Web Speech API)
- **Animations**: Framer Motion (visual feedback on success / failure)
- **i18n**: `react-i18next` for UI labels in the selected language

### Backend / API (current repo)
- **Runtime**: Node.js + Express (existing structure)
- **REST endpoints** to serve tongue twister phrases and persist scores
- **Swagger** documentation already present — extend with new routes

### Database
- **SQLite** (via `better-sqlite3`) for local / lightweight deployment
- Or **PostgreSQL** (via `pg`) for production
- Schema kept minimal (see below)

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
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scores per player per phrase
CREATE TABLE scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase_id   INTEGER NOT NULL REFERENCES phrases(id),
  player_name TEXT NOT NULL,
  time_ms     INTEGER NOT NULL,   -- elapsed time in milliseconds
  accuracy    REAL NOT NULL,      -- 0.0 – 1.0
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Routes (to add)

| Method | Route                        | Description                              |
|--------|------------------------------|------------------------------------------|
| GET    | `/phrases`                   | List all phrases (filter by `?lang=fr`)  |
| GET    | `/phrases/:id`               | Get a single phrase                      |
| POST   | `/phrases`                   | Add a new phrase (admin)                 |
| GET    | `/scores`                    | Leaderboard (filter by `?lang=fr`)       |
| POST   | `/scores`                    | Submit a new score                       |
| GET    | `/scores/top`                | Top 10 scores per language               |

---

## Game Flow

```
1. Language Selection screen
        ↓
2. Difficulty Selection (easy / medium / hard)
        ↓
3. Phrase Display
   - Show the tongue twister text
   - "Press to speak" button
        ↓
4. Recording
   - Microphone activates
   - Stopwatch starts
   - Real-time transcript shown below the phrase
        ↓
5. Validation
   ├── Match ≥ threshold → SUCCESS
   │     - Stop timer
   │     - Calculate score
   │     - Show celebration animation
   │     - Prompt to save score (enter name)
   │     - POST /scores
   │
   └── No match → FAILURE
         - Show "Try again" feedback
         - Reset timer
         - Return to step 4
        ↓
6. Leaderboard (after save or skip)
   - Top scores for current language
```

---

## Folder Structure (planned)

```
tongue-twister-api/          ← this repo (backend)
├── api/
│   ├── phrases.js
│   └── scores.js
├── db/
│   ├── schema.sql
│   └── seed.sql             ← sample phrases per language
├── server.js
└── swagger/

tongue-twister-app/          ← separate frontend repo
├── src/
│   ├── components/
│   │   ├── PhraseCard.tsx
│   │   ├── MicButton.tsx
│   │   ├── Timer.tsx
│   │   ├── ScoreBoard.tsx
│   │   └── LanguagePicker.tsx
│   ├── hooks/
│   │   ├── useSpeech.ts
│   │   └── useTimer.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Game.tsx
│   │   └── Leaderboard.tsx
│   ├── store/
│   │   └── gameStore.ts
│   └── i18n/
│       ├── fr.json
│       ├── en.json
│       ├── ko.json
│       └── vi.json
└── vite.config.ts
```

---

## Browser Compatibility

The **Web Speech API** is required for microphone recognition. It is supported in:
- Chrome / Edge (full support)
- Safari 14.1+ (partial)
- Firefox (not supported natively — fallback message shown)

A browser compatibility warning is shown if the API is unavailable.

---

## Seed Data Examples

| Language   | Phrase                                                       | Difficulty |
|------------|--------------------------------------------------------------|------------|
| French     | "Un chasseur sachant chasser sait chasser sans son chien"    | hard       |
| English    | "She sells seashells by the seashore"                        | medium     |
| Korean     | "간장 공장 공장장은 강 공장장이고 된장 공장 공장장은 장 공장장이다" | hard    |
| Vietnamese | "Lúa nếp là lúa nếp nàng, lúa lên lớp lớp lòng nàng lúa ơi" | medium   |

---

## Milestones

| # | Milestone                               | Deliverables                                      |
|---|-----------------------------------------|---------------------------------------------------|
| 1 | Backend foundations                     | DB schema, seed data, `/phrases` + `/scores` APIs |
| 2 | Frontend scaffold                       | Vite + React + Tailwind, routing, i18n setup      |
| 3 | Speech integration                      | Mic capture, transcript display, match logic      |
| 4 | Scoring & timer                         | Score calculation, timer component, POST score    |
| 5 | Leaderboard & language selector         | Leaderboard page, language/country filter         |
| 6 | Polish & deploy                         | Animations, error states, Docker, CI/CD           |
