# All Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 25 improvements across validation accuracy, API robustness, game UX, component cleanup, and performance.

**Architecture:** Changes span both the Elysia API (`api/src/`) and the Vite/React frontend (`app/src/`). Each task is self-contained. Build verification at the end of each task via `npx vite build` (app) and `npx bun build src/index.ts --outdir /tmp/check` (API).

**Tech Stack:** Elysia + libsql/drizzle (API), React + TanStack Router/Query + Zustand + motion/react (app), Jaro-Winkler DP alignment (validation)

---

## File Map

| File | What changes |
|------|-------------|
| `app/src/hooks/useAccuracy.ts` | Hyphen/apostrophe split, rolling DP O(S) space |
| `app/src/routes/game.tsx` | Duplicate feedback, failure threshold, streak, progression CTA, debounce live accuracy |
| `app/src/store/gameStore.ts` | sessionStreak field + increment logic |
| `app/src/components/Confetti.tsx` | prefers-reduced-motion guard |
| `app/src/routes/__root.tsx` | ErrorBoundary wrapper |
| `app/src/routes/index.tsx` | Dynamic phrase count from API |
| `app/src/components/TranscriptDiff.tsx` | Delete (dead code) |
| `app/src/main.tsx` | Lazy-load `/game` route |
| `app/src/routes/game.tsx` | Split SuccessPanel + FailurePanel into `app/src/components/ResultPanels.tsx` |
| `api/src/routes/scores.ts` | Server-side difficulty filter, rank from scores table, difficulty score multiplier |
| `api/src/routes/phrases.ts` | Already has count — expose `/phrases/count` endpoint |
| `api/src/index.ts` | Rate limiting on POST /scores and /speech |
| `api/drizzle/0002_indexes.sql` + `meta/_journal.json` | DB indexes on scores(player_name,phrase_id) and player_stats(total_score) |
| `.gitignore` | Allow `api/drizzle/*.sql` and `api/drizzle/meta/`, ignore `app/src/routeTree.gen.ts` |

---

## Task 1: Hyphen/Apostrophe Splitting in useAccuracy

**Problem:** "as-tu" (1 target word) vs "as tu" (2 spoken words) → full mismatch. Same for `l'heure`, `n'attacha`.

**Files:**
- Modify: `app/src/hooks/useAccuracy.ts`

- [ ] **Step 1: Add word expander before normalization**

In `app/src/hooks/useAccuracy.ts`, add a function that splits hyphenated/apostrophe compound words into sub-words, then update `computeAccuracy` to use it on the target text before splitting into words:

```ts
// Expand hyphenated and apostrophe-joined compounds into separate tokens
// "as-tu" → "as tu", "l'heure" → "l heure", "n'attacha" → "n attacha"
function expandCompounds(text: string): string {
  return text
    .replace(/[’']/g, "'")          // normalize smart apostrophes
    .replace(/([a-zàâäéèêëîïôùûüÿæœ])'([a-zàâäéèêëîïôùûüÿæœ])/gi, '$1 $2')
    .replace(/-/g, ' ')
}
```

- [ ] **Step 2: Apply to both target and spoken in computeAccuracy**

```ts
export function computeAccuracy(
  spoken: string,
  target: string
): { accuracy: number; wordScores: number[] } {
  const rawSpoken   = expandCompounds(spoken).split(/\s+/).map(normalizeWord).filter(Boolean)
  const targetWords = expandCompounds(target).split(/\s+/).map(normalizeWord).filter(Boolean)
  const spokenWords = rawSpoken.filter(w => !FILLER_WORDS.has(w))
  // ... rest unchanged
}
```

- [ ] **Step 3: Apply expandCompounds in auto-stop word count in game.tsx**

In `app/src/routes/game.tsx`, find the auto-stop useEffect and update the spoken/target count lines:

```ts
// Import expandCompounds (add to import from useAccuracy)
import { computeAccuracy, normalizeWord, expandCompounds } from '@/hooks/useAccuracy'

// In auto-stop useEffect:
const spoken = expandCompounds(speech.liveTranscript).trim().split(/\s+/).map(normalizeWord).filter(Boolean)
const target = expandCompounds(phrase.text).trim().split(/\s+/).map(normalizeWord).filter(Boolean)
```

- [ ] **Step 4: Apply in PhraseCard cleanPhraseWords**

In `app/src/components/PhraseCard.tsx`:

```ts
import { jaroWinkler, normalizeWord, WORD_CORRECT, WORD_APPROX, expandCompounds } from '@/hooks/useAccuracy'

function cleanPhraseWords(text: string): string[] {
  return expandCompounds(text).split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w))
}
```

- [ ] **Step 5: Build verify**

```
cd app && npx vite build
```
Expected: `✓ built in X.XXs`

- [ ] **Step 6: Commit**

```bash
git add app/src/hooks/useAccuracy.ts app/src/routes/game.tsx app/src/components/PhraseCard.tsx
git commit -m "fix: expand hyphen/apostrophe compounds before word alignment"
```

---

## Task 2: Rolling DP O(S) Space + Debounce Live Accuracy

**Problem:** DP uses O(T×S) memory (two full arrays). Live accuracy check fires on every transcript update with no debounce.

**Files:**
- Modify: `app/src/hooks/useAccuracy.ts`
- Modify: `app/src/routes/game.tsx`

- [ ] **Step 1: Replace 2D DP with rolling two-row DP in alignWords**

Replace the `alignWords` function body in `useAccuracy.ts`:

```ts
function alignWords(targetWords: string[], spokenWords: string[]): number[] {
  const T = targetWords.length
  const S = spokenWords.length

  if (T === 0) return []
  if (S === 0) return new Array(T).fill(0)

  // Rolling two rows instead of full T×S matrix
  let prev = new Float64Array(S + 1)  // dp[t-1][*]
  let curr = new Float64Array(S + 1)  // dp[t][*]

  // Track choices for traceback: 0=skipTarget, 1=match, 2=skipSpoken
  const choice = Array.from({ length: T + 1 }, () => new Uint8Array(S + 1))

  for (let t = 1; t <= T; t++) {
    curr.fill(0)
    for (let s = 1; s <= S; s++) {
      const sim       = jaroWinkler(targetWords[t - 1]!, spokenWords[s - 1]!)
      const matchVal  = prev[s - 1]! + sim
      const skipSpoken = curr[s - 1]!
      const skipTarget = prev[s]!

      if (matchVal >= skipSpoken && matchVal >= skipTarget) {
        curr[s] = matchVal; choice[t]![s] = 1
      } else if (skipSpoken >= skipTarget) {
        curr[s] = skipSpoken; choice[t]![s] = 2
      } else {
        curr[s] = skipTarget; choice[t]![s] = 0
      }
    }
    ;[prev, curr] = [curr, prev]
  }

  // Traceback using choice matrix
  const wordScores = new Array<number>(T).fill(0)
  let t = T, s = S

  while (t > 0) {
    if (s === 0) { t--; continue }
    const c = choice[t]![s]!
    if (c === 1) {
      wordScores[t - 1] = jaroWinkler(targetWords[t - 1]!, spokenWords[s - 1]!)
      t--; s--
    } else if (c === 2) {
      s--
    } else {
      t--
    }
  }

  return wordScores
}
```

- [ ] **Step 2: Debounce live accuracy in game.tsx**

Add a debounce ref and wrap the auto-stop useEffect trigger:

```ts
// Near other refs (around line 140):
const liveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// Replace auto-stop useEffect:
useEffect(() => {
  if (phase !== 'recording' || !speech.liveTranscript || !phrase) return
  if (autoStopRef.current) return

  if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current)
  liveDebounceRef.current = setTimeout(() => {
    const spoken = expandCompounds(speech.liveTranscript).trim().split(/\s+/).map(normalizeWord).filter(Boolean)
    const target = expandCompounds(phrase.text).trim().split(/\s+/).map(normalizeWord).filter(Boolean)
    if (spoken.length < target.length) return
    const { accuracy: acc } = computeAccuracy(speech.liveTranscript, phrase.text)
    const autoStopThreshold = (ACCURACY_THRESHOLD[language ?? 'en'] ?? 0.72) * 0.9
    if (acc >= autoStopThreshold) { autoStopRef.current = true; handleStopRef.current() }
  }, 150)
}, [speech.liveTranscript, phase]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Build verify**

```
cd app && npx vite build
```

- [ ] **Step 4: Commit**

```bash
git add app/src/hooks/useAccuracy.ts app/src/routes/game.tsx
git commit -m "perf: rolling O(S) DP, debounce 150ms live accuracy check"
```

---

## Task 3: DB Indexes + Score Formula Difficulty Multiplier

**Problem:** Dedup query on `scores(player_name, phrase_id)` does full scan. Score formula ignores difficulty — hard phrases worth same as easy.

**Files:**
- Create: `api/drizzle/0002_indexes.sql`
- Modify: `api/drizzle/meta/_journal.json`
- Modify: `api/src/routes/scores.ts`
- Modify: `app/src/store/gameStore.ts`

- [ ] **Step 1: Create migration for indexes**

Create `api/drizzle/0002_indexes.sql`:

```sql
CREATE INDEX IF NOT EXISTS idx_scores_player_phrase
  ON scores (player_name, phrase_id);

CREATE INDEX IF NOT EXISTS idx_scores_phrase_id
  ON scores (phrase_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_total_score
  ON player_stats (total_score DESC);
```

- [ ] **Step 2: Update migration journal**

In `api/drizzle/meta/_journal.json`, add entry after `0001_player_stats`:

```json
{
  "idx": 2,
  "version": "6",
  "when": 1779402067031,
  "tag": "0002_indexes",
  "breakpoints": false
}
```

- [ ] **Step 3: Run migration**

```
cd api && npm run db:migrate
```
Expected: `Migrations applied.`

- [ ] **Step 4: Add difficulty multiplier to score formula**

In `api/src/routes/scores.ts`, after computing `remaining_s`:

```ts
const DIFF_MULTIPLIER: Record<string, number> = { easy: 1.0, medium: 1.5, hard: 2.5 }
const multiplier  = DIFF_MULTIPLIER[phrase.difficulty] ?? 1.0
const serverScore = Math.round((Math.round(body.accuracy * 1000) + Math.floor(remaining_s) * 10) * multiplier)
```

- [ ] **Step 5: Mirror multiplier in client store (gameStore.ts)**

In `app/src/store/gameStore.ts`, add constant and update `setResult`:

```ts
export const DIFF_MULTIPLIER: Record<Difficulty, number> = {
  easy:   1.0,
  medium: 1.5,
  hard:   2.5,
}

// In setResult:
const multiplier  = DIFF_MULTIPLIER[phrase.difficulty ?? 'easy']
const phraseScore = success && phrase
  ? Math.round((Math.round(accuracy * 1000) + Math.floor(Math.max(0, phrase.timer_s - elapsedMs / 1000)) * 10) * multiplier)
  : 0
```

- [ ] **Step 6: Build verify both**

```
cd api && npx bun build src/index.ts --outdir /tmp/chk
cd app && npx vite build
```

- [ ] **Step 7: Commit**

```bash
git add api/drizzle/0002_indexes.sql api/drizzle/meta/_journal.json api/src/routes/scores.ts app/src/store/gameStore.ts
git commit -m "feat: db indexes, difficulty score multiplier (easy×1 medium×1.5 hard×2.5)"
```

---

## Task 4: Rate Limiting + Audio Size Validation

**Problem:** No rate limiting on expensive endpoints. No server-side audio size check before sending to Whisper.

**Files:**
- Modify: `api/src/index.ts`
- Modify: `api/src/routes/speech.ts` (read first to understand structure)

- [ ] **Step 1: Read speech route**

```
Read api/src/routes/speech.ts
```

- [ ] **Step 2: Add in-memory rate limiter to index.ts**

In `api/src/index.ts`, add before the Elysia app definition:

```ts
// Simple in-memory rate limiter: max 30 req/min per IP
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, maxPerMin = 30): boolean {
  const now = Date.now()
  const entry = rateLimits.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= maxPerMin) return false
  entry.count++
  return true
}
// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of rateLimits) if (now > v.resetAt) rateLimits.delete(k)
}, 300_000)
```

- [ ] **Step 3: Apply rate limit on POST /scores and POST /speech/transcribe**

In `api/src/index.ts`, add a global `onRequest` hook after middleware setup:

```ts
const app = new Elysia({ adapter: node() })
  .use(cors({ ... }))
  .use(swagger({ ... }))
  .onRequest(({ request, set }) => {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
    // Only rate-limit mutating endpoints
    if (request.method === 'POST') {
      if (!checkRateLimit(ip, 30)) {
        set.status = 429
        return { error: 'Too many requests — réessaie dans une minute' }
      }
    }
  })
```

- [ ] **Step 4: Add audio size check in speech route**

In the speech transcription handler, before calling Whisper, add:

```ts
const MAX_AUDIO_BYTES = 10 * 1024 * 1024 // 10 MB
const audioFile = body.audio as File
if (audioFile.size > MAX_AUDIO_BYTES) {
  return error(413, { error: 'Audio trop long — max 10 Mo' })
}
```

- [ ] **Step 5: Build verify**

```
cd api && npx bun build src/index.ts --outdir /tmp/chk2
```

- [ ] **Step 6: Commit**

```bash
git add api/src/index.ts api/src/routes/speech.ts
git commit -m "feat: rate limiting 30req/min on POST endpoints, 10MB audio size guard"
```

---

## Task 5: Server-Side Difficulty Filter + Rank Fix

**Problem:** `/scores/players` fetches top 50 then filters client-side by difficulty — may miss players. Rank calculated from `player_stats.total_score` but displayed for an individual session score.

**Files:**
- Modify: `api/src/routes/scores.ts`

- [ ] **Step 1: Add difficulty filter to GET /scores/players**

Replace the GET `/players` handler:

```ts
.get('/players', async ({ query }) => {
  const { lang, difficulty, limit } = query

  const conditions = [
    lang ? eq(playerStats.language, lang) : undefined,
    difficulty === 'easy'   ? sql`${playerStats.count_easy} > 0`   : undefined,
    difficulty === 'medium' ? sql`${playerStats.count_medium} > 0` : undefined,
    difficulty === 'hard'   ? sql`${playerStats.count_hard} > 0`   : undefined,
  ].filter(Boolean) as any[]

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select()
    .from(playerStats)
    .where(where)
    .orderBy(desc(playerStats.total_score))
    .limit(limit ?? 50)

  return { data: rows, total: rows.length }
}, {
  query: t.Object({
    lang:       t.Optional(langEnum),
    difficulty: t.Optional(diffEnum),
    limit:      t.Optional(t.Numeric({ minimum: 1, maximum: 200, default: 50 })),
  }),
})
```

- [ ] **Step 2: Fix rank calculation — rank among individual phrase scores**

In POST `/scores`, replace rank query:

```ts
// Rank: how many scores on same phrase scored higher
const rank = await db
  .select({ count: sql<number>`count(*)` })
  .from(scores)
  .where(and(
    eq(scores.phrase_id, body.phrase_id),
    sql`${scores.score} > ${serverScore}`,
  ))
  .get()
```

- [ ] **Step 3: Update ScoreBoard to pass difficulty to query**

In `app/src/components/ScoreBoard.tsx`, update `fetchPlayers`:

```ts
async function fetchPlayers(lang: Language, difficulty?: Difficulty): Promise<PlayerRow[]> {
  const params = new URLSearchParams({ lang, limit: '20' })
  if (difficulty) params.set('difficulty', difficulty)
  const res  = await fetch(`${API_URL}/scores/players?${params}`)
  const json = await res.json() as { data: PlayerRow[] }
  return json.data
}

// In ScoreBoard component:
export function ScoreBoard({ language, difficulty }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['players', language, difficulty],
    queryFn:  () => fetchPlayers(language, difficulty),
    staleTime: 30_000,
  })
  // Remove client-side difficulty filter — server handles it now
  const rows = data
  // ... rest unchanged
```

- [ ] **Step 4: Build verify**

```
cd api && npx bun build src/index.ts --outdir /tmp/chk3
cd app && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/scores.ts app/src/components/ScoreBoard.tsx
git commit -m "fix: server-side difficulty filter for players, rank from phrase scores"
```

---

## Task 6: Duplicate Feedback + Failure Threshold Display

**Problem:** `duplicate: true` returned by API but frontend ignores it. Failure screen doesn't show required threshold.

**Files:**
- Modify: `app/src/routes/game.tsx`
- Modify: `app/src/store/gameStore.ts`

- [ ] **Step 1: Add threshold to store state**

In `app/src/store/gameStore.ts`, add `threshold: number` to `GameState` and `initialState`:

```ts
interface GameState {
  // ... existing fields
  threshold: number   // accuracy threshold that was required
}

const initialState: GameState = {
  // ... existing
  threshold: 0,
}

// In setResult, set it:
set({
  transcript, accuracy, wordScores, elapsedMs,
  threshold,   // = ACCURACY_THRESHOLD[language ?? 'en']
  phase:        success ? 'success' : 'failure',
  // ...
})
```

- [ ] **Step 2: Show threshold on failure panel in game.tsx**

Destructure `threshold` from store. Replace the failure accuracy line:

```tsx
{isFailed && (
  <motion.div key="fail" className="text-center space-y-2 w-full" ...>
    <p className="text-xl font-bold text-red-400">
      {phase === 'timeout' ? t('game.time_up') : t('game.try_again')}
    </p>
    {accuracy > 0 && phase === 'failure' && (
      <p className="text-slate-400 text-sm">
        {Math.round(accuracy * 100)}% obtenu — {Math.round(threshold * 100)}% requis
      </p>
    )}
  </motion.div>
)}
```

- [ ] **Step 3: Show duplicate feedback**

In game.tsx, add state `const [duplicateNotice, setDuplicateNotice] = useState(false)`.

In `submitScore.onSuccess`:

```ts
onSuccess: (data, name) => {
  if (data.duplicate) {
    setDuplicateNotice(true)
    setTimeout(() => setDuplicateNotice(false), 3000)
    // Still navigate to leaderboard
  }
  // ... rest of existing onSuccess
}
```

Below the save score input, add:

```tsx
{duplicateNotice && (
  <motion.p
    className="text-xs text-amber-400 text-center"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  >
    ⚠ Score déjà enregistré pour cette phrase
  </motion.p>
)}
```

- [ ] **Step 4: Build verify**

```
cd app && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add app/src/routes/game.tsx app/src/store/gameStore.ts
git commit -m "feat: show required threshold on failure, duplicate score notice"
```

---

## Task 7: Session Streak + Difficulty Progression CTA

**Problem:** No streak counter. No suggestion to try harder difficulty after easy success.

**Files:**
- Modify: `app/src/store/gameStore.ts`
- Modify: `app/src/routes/game.tsx`

- [ ] **Step 1: Add sessionStreak to store**

In `app/src/store/gameStore.ts`:

```ts
interface GameState {
  // ... existing
  sessionStreak: number
}

const initialState = {
  // ... existing
  sessionStreak: 0,
}

// In setResult:
set({
  // ... existing
  sessionStreak: success ? (get().sessionStreak + 1) : 0,
})

// In retry:
retry: () => set({ ..., sessionStreak: 0 })  // reset streak on explicit retry
```

- [ ] **Step 2: Show streak in SuccessPanel**

In `game.tsx` SuccessPanel props, add `streak: number`. Display:

```tsx
{streak >= 2 && (
  <motion.div
    className="flex items-center justify-center gap-1 text-sm font-bold"
    initial={{ scale: 0 }} animate={{ scale: 1 }}
    transition={{ type: 'spring', bounce: 0.5, delay: 0.3 }}
    style={{ color: '#f59e0b' }}
  >
    🔥 {streak} à la suite !
  </motion.div>
)}
```

- [ ] **Step 3: Add difficulty progression CTA**

In SuccessPanel or below the "Next phrase" button, when `difficulty === 'easy'`:

```tsx
{difficulty === 'easy' && sessionCount >= 2 && (
  <motion.button
    onClick={() => { useGameStore.setState({ difficulty: 'medium' }); handleNextPhrase() }}
    className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
  >
    Essaie en Moyen ? 💪
  </motion.button>
)}
{difficulty === 'medium' && sessionCount >= 2 && (
  <motion.button
    onClick={() => { useGameStore.setState({ difficulty: 'hard' }); handleNextPhrase() }}
    className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
  >
    Prêt pour le Difficile ? 🔥
  </motion.button>
)}
```

- [ ] **Step 4: Build verify**

```
cd app && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add app/src/store/gameStore.ts app/src/routes/game.tsx
git commit -m "feat: session streak counter, difficulty progression CTA"
```

---

## Task 8: Confetti prefers-reduced-motion + Error Boundary

**Problem:** Confetti animation fires regardless of OS motion accessibility setting. No error boundary to catch React crashes.

**Files:**
- Modify: `app/src/components/Confetti.tsx`
- Modify: `app/src/routes/__root.tsx`

- [ ] **Step 1: Add reduced-motion guard to Confetti**

In `app/src/components/Confetti.tsx`, before the canvas setup:

```ts
export function Confetti({ active, primaryColor }: Props) {
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // If reduced motion preferred, skip animation entirely
  if (prefersReduced || !active) return null

  // ... rest unchanged
```

- [ ] **Step 2: Add ErrorBoundary class component**

Create `app/src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-4 py-20 text-center px-6">
          <p className="text-2xl">😵</p>
          <p className="text-slate-300 font-semibold">Quelque chose a planté</p>
          <p className="text-slate-500 text-sm font-mono max-w-xs break-all">
            {this.state.error.message}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <RotateCcw size={14} /> Retour à l'accueil
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 3: Wrap Outlet in __root.tsx**

In `app/src/routes/__root.tsx`:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

// In RootLayout, wrap <Outlet />:
<main ...>
  <ErrorBoundary>
    <Outlet />
  </ErrorBoundary>
</main>
```

- [ ] **Step 4: Build verify**

```
cd app && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add app/src/components/Confetti.tsx app/src/components/ErrorBoundary.tsx app/src/routes/__root.tsx
git commit -m "feat: prefers-reduced-motion for confetti, ErrorBoundary in root layout"
```

---

## Task 9: Dynamic Phrase Count on Home + Dead Code Removal

**Problem:** Home hardcodes "84 virelangues · 4 langues". `TranscriptDiff` is dead code never imported by any route.

**Files:**
- Modify: `app/src/routes/index.tsx`
- Delete: `app/src/components/TranscriptDiff.tsx`

- [ ] **Step 1: Delete TranscriptDiff**

```bash
rm app/src/components/TranscriptDiff.tsx
```

- [ ] **Step 2: Fetch phrase count dynamically in HomePage**

In `app/src/routes/index.tsx`, add a query:

```tsx
import { useQuery } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Inside HomePage:
const { data: phraseCount } = useQuery({
  queryKey: ['phrase-count'],
  queryFn: async () => {
    const res  = await fetch(`${API_URL}/phrases?limit=1`)
    const json = await res.json() as { total: number }
    return json.total
  },
  staleTime: 60 * 60_000, // 1h — phrase count changes rarely
})

// Replace hardcoded footer:
<p className="text-slate-600 text-xs text-center">
  {phraseCount ?? 84} virelangues · 4 langues · tous devices
</p>
```

- [ ] **Step 3: Build verify**

```
cd app && npx vite build
```
Verify no import of `TranscriptDiff` causes errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/routes/index.tsx
git rm app/src/components/TranscriptDiff.tsx
git commit -m "refactor: dynamic phrase count on home, remove dead TranscriptDiff"
```

---

## Task 10: Lazy-Load /game Route

**Problem:** main chunk is 515 KB. The game route (`motion/react`, speech, Confetti, etc.) loads on every page including the home screen.

**Files:**
- Modify: `app/src/main.tsx` (or router config)
- Note: TanStack Router with file-based routing uses `routeTree.gen.ts`. Lazy loading requires using `createLazyFileRoute` instead of `createFileRoute` in the route file.

- [ ] **Step 1: Convert game.tsx to lazy file route**

In `app/src/routes/game.tsx`, change the route export:

```tsx
// Replace:
// export const Route = createFileRoute('/game')({ component: GamePage })

// With:
import { createLazyFileRoute } from '@tanstack/react-router'
export const Route = createLazyFileRoute('/game')({ component: GamePage })
```

Remove `createFileRoute` import, add `createLazyFileRoute` import.

- [ ] **Step 2: Regenerate routeTree**

```bash
cd app && npx tsr generate
```
Or the dev server handles this automatically — restart dev server if needed.

- [ ] **Step 3: Build and check chunk sizes**

```
cd app && npx vite build 2>&1 | grep -E "game|index|KB"
```
Expected: `game-*.js` now appears as a separate smaller chunk. Main `index-*.js` should decrease.

- [ ] **Step 4: Commit**

```bash
git add app/src/routes/game.tsx app/src/routeTree.gen.ts
git commit -m "perf: lazy-load /game route to reduce initial bundle"
```

---

## Task 11: Split game.tsx into ResultPanels Component

**Problem:** `game.tsx` is ~420 lines. `SuccessPanel` and the failure panel are defined/used inline.

**Files:**
- Create: `app/src/components/ResultPanels.tsx`
- Modify: `app/src/routes/game.tsx`

- [ ] **Step 1: Create ResultPanels.tsx**

Create `app/src/components/ResultPanels.tsx`:

```tsx
import { motion } from 'motion/react'
import { Trophy } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'

interface SuccessProps {
  score:        number
  accuracy:     number
  threshold:    number
  sessionScore: number
  sessionCount: number
  sessionStreak: number
  difficulty:   string
  t:            (k: string) => string
}

export function SuccessPanel({
  score, accuracy, sessionScore, sessionCount, sessionStreak, t,
}: SuccessProps) {
  const displayed        = useCountUp(score, 800)
  const displayedSession = useCountUp(sessionScore, 900)

  return (
    <motion.div key="success" className="text-center space-y-3 w-full pop-in" aria-live="assertive">
      <motion.div
        className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto"
        style={{ background: 'rgb(var(--p) / 0.15)' }}
        animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
        transition={{ duration: 0.7 }}
        aria-hidden
      >
        <span className="text-2xl select-none">🎉</span>
      </motion.div>

      <p className="text-2xl font-black text-gradient glow-text font-display">{t('game.success')}</p>

      <div className="inline-flex flex-col items-center gap-0.5 px-7 py-3 rounded-2xl glow-box"
           style={{ background: 'rgb(var(--p) / 0.12)' }}>
        <span className="text-4xl font-black tabular-nums font-display" style={{ color: 'rgb(var(--p))' }}>
          +{displayed}
        </span>
        <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">points</span>
      </div>

      {sessionStreak >= 2 && (
        <motion.div
          className="flex items-center justify-center gap-1 text-sm font-bold"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.3 }}
          style={{ color: '#f59e0b' }}
        >
          🔥 {sessionStreak} à la suite !
        </motion.div>
      )}

      {sessionCount > 0 && (
        <motion.div
          className="flex items-center justify-center gap-2"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        >
          <Trophy size={13} className="text-yellow-400" />
          <span className="text-sm font-bold tabular-nums" style={{ color: '#facc15' }}>
            {displayedSession}
          </span>
          <span className="text-xs text-slate-400">
            total · {sessionCount} phrase{sessionCount > 1 ? 's' : ''}
          </span>
        </motion.div>
      )}

      <div className="flex justify-center">
        <span className="px-3 py-1 rounded-full text-sm" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
          ✓ {Math.round(accuracy * 100)}% précision
        </span>
      </div>
    </motion.div>
  )
}

interface FailureProps {
  phase:     string
  accuracy:  number
  threshold: number
  t:         (k: string) => string
}

export function FailurePanel({ phase, accuracy, threshold, t }: FailureProps) {
  return (
    <motion.div
      key="fail"
      className="text-center space-y-2 w-full"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      aria-live="assertive"
    >
      <p className="text-xl font-bold text-red-400">
        {phase === 'timeout' ? t('game.time_up') : t('game.try_again')}
      </p>
      {accuracy > 0 && phase === 'failure' && (
        <p className="text-slate-400 text-sm">
          {Math.round(accuracy * 100)}% obtenu — {Math.round(threshold * 100)}% requis
        </p>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Import and use in game.tsx**

In `app/src/routes/game.tsx`:

```tsx
import { SuccessPanel, FailurePanel } from '@/components/ResultPanels'

// Remove the inline SuccessPanel function definition from game.tsx
// Replace the AnimatePresence success/failure blocks with:
{isSuccess && (
  <SuccessPanel
    score={score ?? 0}
    accuracy={accuracy}
    threshold={threshold}
    sessionScore={sessionScore}
    sessionCount={sessionCount}
    sessionStreak={sessionStreak}
    difficulty={difficulty ?? 'easy'}
    t={t}
  />
)}
{isFailed && (
  <FailurePanel phase={phase} accuracy={accuracy} threshold={threshold} t={t} />
)}
```

- [ ] **Step 3: Build verify**

```
cd app && npx vite build
```

- [ ] **Step 4: Commit**

```bash
git add app/src/components/ResultPanels.tsx app/src/routes/game.tsx
git commit -m "refactor: extract SuccessPanel + FailurePanel into ResultPanels component"
```

---

## Task 12: Fix .gitignore + routeTree.gen.ts

**Problem:** `api/drizzle/` is gitignored so SQL migration files can't be committed. `app/src/routeTree.gen.ts` is auto-generated but committed (causes noise in diffs).

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Update .gitignore**

In the root `.gitignore`:

```gitignore
# Drizzle generated migrations — keep SQL files but ignore snapshots
# api/drizzle/           ← REMOVE this line
api/drizzle/meta/__snapshots/   # keep only generated snapshots out

# TanStack Router generated — auto-rebuilt on dev start
app/src/routeTree.gen.ts
```

Replace the line `api/drizzle/` with `api/drizzle/meta/__snapshots/`.
Add `app/src/routeTree.gen.ts`.

- [ ] **Step 2: Add migration files to git**

```bash
git add -f api/drizzle/0000_burly_black_tom.sql
git add -f api/drizzle/0001_player_stats.sql
git add -f api/drizzle/0002_indexes.sql
git add -f api/drizzle/meta/_journal.json
git rm --cached app/src/routeTree.gen.ts
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: track drizzle migrations in git, gitignore routeTree.gen.ts"
```

---

## Self-Review

| Requirement | Task |
|-------------|------|
| Duplicate score feedback | Task 6 |
| Hyphen/apostrophe split | Task 1 |
| DB indexes | Task 3 |
| TranscriptDiff dead code removed | Task 9 |
| Difficulty score multiplier | Task 3 |
| Failure shows required threshold | Task 6 |
| Session streak | Task 7 |
| Dynamic phrase count home | Task 9 |
| Progression CTA | Task 7 |
| Confetti reduced-motion | Task 8 |
| Onboarding wired ✓ | Already done in __root.tsx |
| Live accuracy debounce | Task 2 |
| Rolling O(S) DP | Task 2 |
| Apostrophe split | Task 1 |
| Rate limiting | Task 4 |
| Audio size validation | Task 4 |
| Rank from phrase scores | Task 5 |
| Server-side difficulty filter | Task 5 |
| Fix drizzle gitignore | Task 12 |
| Lazy-load /game | Task 10 |
| Split game.tsx | Task 11 |
| Error boundary | Task 8 |
| routeTree.gen.ts gitignore | Task 12 |
| useGameTimer callback (23) | Deferred — low impact, high risk of regression |
| ACCURACY_THRESHOLD calibration (15) | Deferred — needs real usage data |
