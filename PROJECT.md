# Tongue Twister Game — Spécification technique complète

## Table des matières

1. [Vision & objectifs](#1-vision--objectifs)
2. [Architecture globale](#2-architecture-globale)
3. [Fonctionnalités détaillées](#3-fonctionnalités-détaillées)
4. [Stack technique & justifications](#4-stack-technique--justifications)
5. [Schéma de base de données](#5-schéma-de-base-de-données)
6. [Contrats API](#6-contrats-api)
7. [Pipeline de reconnaissance vocale](#7-pipeline-de-reconnaissance-vocale)
8. [Machine d'état du jeu](#8-machine-détat-du-jeu)
9. [Composants frontend](#9-composants-frontend)
10. [Store Zustand](#10-store-zustand)
11. [Internationalisation](#11-internationalisation)
12. [Données de seed](#12-données-de-seed)
13. [Compatibilité & PWA](#13-compatibilité--pwa)
14. [Accessibilité](#14-accessibilité)
15. [Sécurité](#15-sécurité)
16. [Performance](#16-performance)
17. [Tests](#17-tests)
18. [Déploiement](#18-déploiement)
19. [Jalons de développement](#19-jalons-de-développement)
20. [Roadmap v2](#20-roadmap-v2)

---

## 1. Vision & objectifs

### Concept

Un jeu de virelangues multilingue où le joueur prononce des phrases dans son micro. L'application transcrit la voix, compare au texte cible, et valide uniquement si la prononciation est suffisamment précise. Un timer par round crée la pression. Les scores sont sauvegardés dans un leaderboard par langue et difficulté.

### Objectifs produit

| Priorité | Objectif |
|----------|----------|
| Must have | Reconnaissance vocale universelle (tous navigateurs, tous OS) |
| Must have | Timer de jeu animé par difficulté |
| Must have | Validation stricte : pas de score si la prononciation est incorrecte |
| Must have | Leaderboard par langue |
| Must have | 4 langues : français, anglais, coréen, vietnamien |
| Should have | PWA installable sur mobile |
| Should have | Différenciation des mots mal prononcés dans le feedback |
| Could have | Mode multijoueur (même phrase, même timer) |
| Won't have (v1) | Reconnaissance du ton (vietnamien) au niveau phonémique |

---

## 2. Architecture globale

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                         │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  React 19    │    │  Zustand v5  │    │ TanStack     │  │
│  │  + Vite 6    │◄──►│  game store  │    │ Query v5     │  │
│  └──────┬───────┘    └──────────────┘    └──────┬───────┘  │
│         │                                        │          │
│  ┌──────▼───────────────────────────────────────▼───────┐  │
│  │               useSpeech hook                          │  │
│  │  MediaRecorder API  ──►  audio chunks (webm/ogg)      │  │
│  │  Web Speech API     ──►  partial transcript (fallback)│  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTPS / WebSocket
              ┌───────────────▼──────────────────┐
              │        BACKEND  (Hono + Bun)      │
              │                                   │
              │  POST /speech/transcribe           │
              │    └─► OpenAI Whisper API          │
              │                                   │
              │  GET  /phrases                    │
              │  POST /scores                     │
              │  GET  /scores/top                 │
              └───────────────┬───────────────────┘
                              │
              ┌───────────────▼──────────────────┐
              │   DATABASE  (SQLite / Turso)      │
              │   tables: phrases, scores         │
              └───────────────────────────────────┘
```

### Flux de données principal

```
Joueur parle
    │
    ▼
MediaRecorder capture audio (chunks toutes les 250ms)
    │
    ▼
useSpeech accumule les chunks → Blob audio (webm)
    │
    ├──► [Chrome/Edge] Web Speech API → transcript partiel affiché en live
    │
    ▼
Joueur relâche le bouton OU silence détecté
    │
    ▼
POST /speech/transcribe  { audio: base64, language: 'fr' }
    │
    ▼
Hono → OpenAI Whisper → { text: "un chasseur sachant..." }
    │
    ▼
fuzzyMatch(transcript, targetPhrase) → { accuracy: 0.93 }
    │
    ├── accuracy ≥ seuil  →  SUCCESS → POST /scores
    └── accuracy < seuil  →  FAILURE → affiche diff, reset timer
```

---

## 3. Fonctionnalités détaillées

### 3.1 Reconnaissance vocale

**Stratégie dual-path :**

- **Path A — Whisper (principal, universel)**
  - MediaRecorder capture l'audio en `audio/webm;codecs=opus`
  - Envoyé en base64 au backend dès que le joueur relâche le bouton
  - Le backend transmet à `openai.audio.transcriptions.create` avec `model: "whisper-1"` et `language` explicite
  - Latence cible : < 2 secondes
  - Fonctionne sur tous les navigateurs et tous les appareils

- **Path B — Web Speech API (fallback rapide)**
  - Activé uniquement sur Chrome et Edge
  - Affiche un transcript partiel en temps réel sous la phrase (guide visuel)
  - N'est pas utilisé pour la validation finale — Whisper reste la source de vérité

**Seuils de précision par langue :**

| Langue     | Seuil de validation | Raison |
|------------|---------------------|--------|
| Français   | 0.85 | Liaisons, nasales complexes |
| Anglais    | 0.88 | Phonèmes relativement stables |
| Coréen     | 0.80 | Whisper performe bien mais les tons sont absents |
| Vietnamien | 0.75 | Tons diacritiques rarement capturés parfaitement |

### 3.2 Timer de jeu

Le timer est la pression centrale du jeu. Il démarre au moment où le joueur appuie sur le bouton micro.

**Durées par difficulté :**

| Difficulté | Durée  | Cible joueur |
|------------|--------|--------------|
| Facile     | 30 s   | Enfants, débutants |
| Moyen      | 20 s   | Joueur occasionnel |
| Difficile  | 10 s   | Locuteur natif |

**Comportement :**
- Barre animée plein écran (largeur) qui rétrécit de gauche à droite
- Couleur : vert (100–50 %) → orange (50–20 %) → rouge (< 20 %)
- Vibration courte (Vibration API) à 5 secondes restantes
- À zéro : micro coupé, animation "Temps écoulé !", même phrase reproposée
- Timer en pause pendant les 1–2 secondes de traitement Whisper

**Logique de calcul :**

```typescript
const TIMER_DURATION: Record<Difficulty, number> = {
  easy:   30_000,
  medium: 20_000,
  hard:   10_000,
}

// elapsed_ms = Date.now() - startTime  (à l'instant de la validation)
// remaining_ms = TIMER_DURATION[difficulty] - elapsed_ms

const timeBonus = Math.floor(remaining_ms / 1000) * 10
const score = Math.round(accuracy * 1000) + timeBonus

// Exemples :
// accuracy=0.95, 12s restantes  → score = 950 + 120 = 1070
// accuracy=0.88, 3s restantes   → score = 880 + 30  = 910
// accuracy=0.75, 28s restantes  → score = 750 + 280 = 1030  (précision faible compensée)
```

### 3.3 Algorithme de comparaison de texte

Utilisation d'une **distance de Jaro-Winkler** normalisée, appliquée mot par mot puis moyennée.

```typescript
import { jaroWinklerDistance } from 'talisman/metrics/jaro-winkler'

function computeAccuracy(spoken: string, target: string): number {
  const normalize = (s: string) =>
    s.toLowerCase()
     .normalize('NFD')                        // décompose les accents
     .replace(/[̀-ͯ]/g, '')         // supprime les diacritiques
     .replace(/[^a-z0-9\s]/g, '')             // retire la ponctuation
     .trim()

  const spokenWords  = normalize(spoken).split(/\s+/)
  const targetWords  = normalize(target).split(/\s+/)
  const maxLen       = Math.max(spokenWords.length, targetWords.length)

  let totalScore = 0
  for (let i = 0; i < maxLen; i++) {
    const sw = spokenWords[i]  ?? ''
    const tw = targetWords[i]  ?? ''
    totalScore += jaroWinklerDistance(sw, tw)
  }
  return totalScore / maxLen
}
```

**Cas particuliers :**
- Coréen : la normalisation conserve les blocs Hangul, Jaro-Winkler fonctionne sur les caractères Unicode
- Vietnamien : les diacritiques de ton sont retirés pour l'instant (v1), seule la structure syllabique compte

### 3.4 Feedback de prononciation

En cas d'échec, chaque mot est coloré selon son score individuel :

- Vert ≥ 0.90 : mot bien prononcé
- Orange 0.70–0.89 : approximatif
- Rouge < 0.70 : mot raté

```
Phrase cible  :  Un  chasseur  sachant  chasser  sans  son  chien
Prononcé      :  Un  chaseur   sachant  chasser  sans  son  chiens

Résultat      : [✓vert] [orange] [✓vert] [✓vert] [✓vert] [✓vert] [rouge]
```

---

## 4. Stack technique & justifications

### Frontend

| Technologie | Version | Pourquoi |
|-------------|---------|----------|
| **React** | 19 | `use()`, Server Components optionnels, concurrent rendering stable |
| **Vite** | 6 | HMR < 50ms, plugin PWA officiel, Rollup 4, ESM natif |
| **TypeScript** | 5.5+ | `strict: true`, décorateurs ES2023, `satisfies` |
| **Tailwind CSS** | v4 | Config en CSS pur (plus de `tailwind.config.js`), Lightning CSS, tokens natifs |
| **TanStack Router** | 1.x | Routes 100 % typées, file-based, loader/action pattern |
| **TanStack Query** | 5.x | Cache automatique, `staleTime`, `optimisticUpdate` |
| **Zustand** | 5 | Store minimal, pas de Provider, `immer` middleware pour les mutations |
| **Motion** | 12 | API `animate()` impérative + `<motion.div>` déclaratif, spring physics |
| **react-i18next** | 15+ | Lazy loading des namespaces, détection de langue automatique |
| **vite-plugin-pwa** | latest | Workbox intégré, manifest auto-généré, `precacheAndRoute` |
| **Lucide React** | latest | SVG tree-shakeable, 1 500+ icônes, stylées via className |
| **Vitest** | 2.x | Même config Vite, API Jest-compatible, coverage v8 |
| **Playwright** | latest | Tests e2e cross-browser, screenshot testing |

### Backend

| Technologie | Version | Pourquoi |
|-------------|---------|----------|
| **Bun** | 1.1+ | Runtime JS + SQLite natif + TypeScript sans transpile, startup < 10ms |
| **Hono.js** | 4.x | Fastest Node/Bun framework (bench > Fastify), middleware typé, zValidator |
| **Drizzle ORM** | 0.31+ | Schéma TypeScript → SQL, migrations auto, Drizzle Studio |
| **Zod** | 3.x | Validation des body/query, génération de types automatique |
| **OpenAI SDK** | 4.x | Client officiel Whisper, streaming, retry intégré |
| **Scalar** | latest | Interface OpenAPI 3.1 moderne en remplacement de Swagger UI |

### Base de données

| Environnement | Moteur | Raison |
|---------------|--------|--------|
| Développement | SQLite (Bun built-in) | Zéro configuration, fichier local |
| Production | Turso (LibSQL) | SQLite distribué à l'edge, latence < 10ms, HTTP API |

---

## 5. Schéma de base de données

### Schéma Drizzle (TypeScript)

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const phrases = sqliteTable('phrases', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  language:   text('language', { enum: ['fr', 'en', 'ko', 'vi'] }).notNull(),
  country:    text('country', { enum: ['FR', 'US', 'KR', 'VN'] }).notNull(),
  text:       text('text').notNull(),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull().default('medium'),
  timer_s:    integer('timer_s').notNull().default(20),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const scores = sqliteTable('scores', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  phrase_id:   integer('phrase_id').notNull().references(() => phrases.id),
  player_name: text('player_name').notNull(),
  elapsed_ms:  integer('elapsed_ms').notNull(),
  accuracy:    real('accuracy').notNull(),
  score:       integer('score').notNull(),
  created_at:  text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Types inférés automatiquement
export type Phrase      = typeof phrases.$inferSelect
export type NewPhrase   = typeof phrases.$inferInsert
export type Score       = typeof scores.$inferSelect
export type NewScore    = typeof scores.$inferInsert
```

### Diagramme entité-relation

```
phrases
────────────────────────────────────
PK  id          INTEGER  AUTOINCREMENT
    language    TEXT     'fr'|'en'|'ko'|'vi'
    country     TEXT     'FR'|'US'|'KR'|'VN'
    text        TEXT     contenu de la phrase
    difficulty  TEXT     'easy'|'medium'|'hard'
    timer_s     INTEGER  durée du timer (s)
    created_at  TEXT     horodatage ISO

scores
────────────────────────────────────
PK  id          INTEGER  AUTOINCREMENT
FK  phrase_id   INTEGER  → phrases.id
    player_name TEXT
    elapsed_ms  INTEGER  ms écoulés à la validation
    accuracy    REAL     0.0 – 1.0
    score       INTEGER  calculé côté client, vérifié côté serveur
    created_at  TEXT     horodatage ISO
```

---

## 6. Contrats API

### Base URL

```
Dev  : http://localhost:3000
Prod : https://api.tongue-twister.app
```

### Headers communs

```
Content-Type: application/json
Accept: application/json
```

---

### GET `/phrases`

Retourne la liste des phrases, filtrable.

**Query params :**

| Param | Type | Défaut | Exemple |
|-------|------|--------|---------|
| `lang` | `'fr'\|'en'\|'ko'\|'vi'` | — | `?lang=fr` |
| `difficulty` | `'easy'\|'medium'\|'hard'` | — | `?difficulty=hard` |
| `limit` | `number` | `20` | `?limit=5` |
| `offset` | `number` | `0` | `?offset=20` |

**Réponse 200 :**

```json
{
  "data": [
    {
      "id": 1,
      "language": "fr",
      "country": "FR",
      "text": "Un chasseur sachant chasser sait chasser sans son chien",
      "difficulty": "hard",
      "timer_s": 10
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### GET `/phrases/:id`

**Réponse 200 :**

```json
{
  "id": 1,
  "language": "fr",
  "country": "FR",
  "text": "Un chasseur sachant chasser sait chasser sans son chien",
  "difficulty": "hard",
  "timer_s": 10
}
```

**Réponse 404 :**

```json
{ "error": "Phrase not found" }
```

---

### POST `/phrases` _(admin)_

**Body :**

```json
{
  "language": "fr",
  "country": "FR",
  "text": "Les chaussettes de l'archiduchesse sont-elles sèches ?",
  "difficulty": "medium",
  "timer_s": 20
}
```

**Réponse 201 :**

```json
{ "id": 43 }
```

**Validation Zod :**

```typescript
const phraseSchema = z.object({
  language:   z.enum(['fr', 'en', 'ko', 'vi']),
  country:    z.enum(['FR', 'US', 'KR', 'VN']),
  text:       z.string().min(5).max(300),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  timer_s:    z.number().int().min(5).max(60),
})
```

---

### POST `/speech/transcribe`

Reçoit un fichier audio, retourne la transcription via Whisper.

**Body (multipart/form-data) :**

| Champ | Type | Description |
|-------|------|-------------|
| `audio` | `File` | Blob audio (webm/ogg/wav, max 10 Mo) |
| `language` | `string` | Code langue pour Whisper (`fr`, `en`, `ko`, `vi`) |

**Réponse 200 :**

```json
{
  "transcript": "un chasseur sachant chasser sait chasser sans son chien",
  "confidence": 0.97
}
```

**Réponse 422 :**

```json
{ "error": "Audio too short or silent" }
```

---

### GET `/scores`

**Query params :**

| Param | Type | Exemple |
|-------|------|---------|
| `lang` | string | `?lang=ko` |
| `difficulty` | string | `?difficulty=hard` |
| `phrase_id` | number | `?phrase_id=3` |
| `limit` | number | `?limit=50` |

**Réponse 200 :**

```json
{
  "data": [
    {
      "id": 101,
      "phrase_id": 1,
      "player_name": "Marie",
      "elapsed_ms": 7340,
      "accuracy": 0.96,
      "score": 1030,
      "created_at": "2026-05-21T14:32:00Z"
    }
  ],
  "total": 230
}
```

---

### POST `/scores`

**Body :**

```json
{
  "phrase_id": 1,
  "player_name": "Marie",
  "elapsed_ms": 7340,
  "accuracy": 0.96
}
```

Le serveur **recalcule et vérifie le score** côté serveur pour éviter la triche :

```typescript
const phrase = await db.query.phrases.findFirst({ where: eq(phrases.id, body.phrase_id) })
const remaining_s = Math.max(0, phrase.timer_s - body.elapsed_ms / 1000)
const serverScore = Math.round(body.accuracy * 1000) + Math.floor(remaining_s) * 10
```

**Réponse 201 :**

```json
{
  "id": 102,
  "score": 1030,
  "rank": 3
}
```

---

### GET `/scores/top`

Top 10 par langue, toutes phrases confondues.

**Réponse 200 :**

```json
{
  "fr": [
    { "player_name": "Marie", "score": 1030, "phrase_id": 1 }
  ],
  "en": [ ... ],
  "ko": [ ... ],
  "vi": [ ... ]
}
```

---

## 7. Pipeline de reconnaissance vocale

### Diagramme de séquence

```
Joueur          useSpeech hook       Backend          OpenAI Whisper
  │                   │                 │                    │
  │ appui bouton mic  │                 │                    │
  │──────────────────►│                 │                    │
  │                   │ MediaRecorder   │                    │
  │                   │ .start(250ms)   │                    │
  │                   │                 │                    │
  │ [parle...]        │                 │                    │
  │                   │ ondataavailable │                    │
  │                   │ chunks.push()   │                    │
  │                   │                 │                    │
  │ relâche bouton    │                 │                    │
  │──────────────────►│                 │                    │
  │                   │ MediaRecorder   │                    │
  │                   │ .stop()         │                    │
  │                   │ Blob(chunks)    │                    │
  │                   │────────────────►│                    │
  │                   │                 │ openai.audio       │
  │                   │                 │ .transcriptions    │
  │                   │                 │ .create(file, lang)│
  │                   │                 │───────────────────►│
  │                   │                 │    { text }        │
  │                   │                 │◄───────────────────│
  │                   │◄────────────────│                    │
  │                   │ computeAccuracy │                    │
  │ feedback rendu    │ (transcript,    │                    │
  │◄──────────────────│  targetPhrase)  │                    │
```

### Code du hook `useSpeech`

```typescript
// src/hooks/useSpeech.ts
import { useRef, useState, useCallback } from 'react'

type SpeechState = 'idle' | 'recording' | 'processing' | 'done'

export function useSpeech(language: string) {
  const [state, setState]     = useState<SpeechState>('idle')
  const [transcript, setTranscript] = useState('')
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks        = useRef<Blob[]>([])

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })

    chunks.current = []
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
    mr.start(250)
    mediaRecorder.current = mr
    setState('recording')
  }, [])

  const stop = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const mr = mediaRecorder.current!
      mr.onstop = async () => {
        setState('processing')
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        const form = new FormData()
        form.append('audio', blob, 'recording.webm')
        form.append('language', language)

        const res  = await fetch('/speech/transcribe', { method: 'POST', body: form })
        const data = await res.json()
        setTranscript(data.transcript)
        setState('done')
        resolve(data.transcript)
      }
      mr.stop()
      mr.stream.getTracks().forEach(t => t.stop())
    })
  }, [language])

  const reset = useCallback(() => {
    setState('idle')
    setTranscript('')
  }, [])

  return { state, transcript, start, stop, reset }
}
```

---

## 8. Machine d'état du jeu

```
                    ┌─────────────────┐
              ┌────►│  LANGUAGE_SELECT │
              │     └────────┬────────┘
              │              │ choix langue
              │     ┌────────▼────────┐
              │     │ DIFFICULTY_SELECT│
              │     └────────┬────────┘
              │              │ choix difficulté
              │     ┌────────▼────────┐
              │     │  PHRASE_DISPLAY  │◄──────────────┐
              │     └────────┬────────┘               │
              │              │ appui mic               │ retry
              │     ┌────────▼────────┐               │
              │     │   RECORDING     │               │
              │     └────┬───────┬───┘               │
              │          │       │ timer = 0          │
              │          │       └──────────────►[TIMEOUT]──┘
              │    relâche mic                        
              │     ┌────▼────────────┐
              │     │   PROCESSING    │ (Whisper ~1-2s)
              │     └────┬───────┬───┘
              │          │       │ accuracy < seuil
              │          │       └────────────►[FAILURE]──┐
              │   accuracy ≥ seuil                        │ retry
              │     ┌────▼────────────┐                   │
              │     │    SUCCESS      │              ──────┘
              │     └────┬────────────┘
              │          │ save score
              │     ┌────▼────────────┐
              └─────│   LEADERBOARD   │
                    └─────────────────┘
```

### Types TypeScript du store

```typescript
// src/store/gameStore.ts
type GamePhase =
  | 'language_select'
  | 'difficulty_select'
  | 'phrase_display'
  | 'recording'
  | 'processing'
  | 'success'
  | 'failure'
  | 'timeout'
  | 'leaderboard'

type Difficulty = 'easy' | 'medium' | 'hard'
type Language   = 'fr' | 'en' | 'ko' | 'vi'

interface GameState {
  phase:        GamePhase
  language:     Language | null
  difficulty:   Difficulty | null
  phrase:       Phrase | null
  transcript:   string
  accuracy:     number
  elapsedMs:    number
  score:        number | null
  wordScores:   number[]           // score par mot pour le diff coloré
}
```

---

## 9. Composants frontend

### `<LanguagePicker />`

Affiche 4 cartes cliquables avec drapeau, nom de la langue et exemple de virelangue.

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│    🇫🇷    │  │    🇺🇸    │  │    🇰🇷    │  │    🇻🇳    │
│ Français │  │  English │  │  한국어   │  │ Tiếng Việt│
│  "Un     │  │  "She    │  │ "간장 공장"│  │ "Lúa nếp"│
│ chasseur"│  │  sells..." │  │          │  │           │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### `<DifficultyPicker />`

3 boutons : Facile / Moyen / Difficile, avec indication du timer associé.

### `<PhraseCard />`

La phrase s'affiche en grand au centre. La taille de police est adaptative (`clamp(1.2rem, 4vw, 2rem)`). Sur mobile, la phrase est centrée verticalement dans la hauteur de l'écran disponible.

### `<GameTimer />`

```
┌────────────────────────────────────────────┐
│ ██████████████████████░░░░░░░░░░░  14s     │
└────────────────────────────────────────────┘
    barre CSS animée via motion.div width%
```

Props :

```typescript
interface GameTimerProps {
  durationMs:  number
  running:     boolean
  onTimeout:   () => void
}
```

Animation :

```typescript
<motion.div
  style={{ width: '100%' }}
  animate={{ width: `${percent}%` }}
  transition={{ duration: 0.25, ease: 'linear' }}
  className={cn(
    'h-3 rounded-full transition-colors',
    percent > 50 ? 'bg-green-500' :
    percent > 20 ? 'bg-orange-400' :
                   'bg-red-500'
  )}
/>
```

### `<MicButton />`

Grand bouton circulaire (min 56px de diamètre). État visuel :

| État | Apparence |
|------|-----------|
| `idle` | Gris, icône micro |
| `recording` | Rouge pulsant, onde animée |
| `processing` | Spinner, grisé |
| `success` | Vert, icône check |
| `failure` | Rouge, icône X |

Gestion : `onPointerDown` / `onPointerUp` pour fonctionner sur mobile et desktop sans délai de 300ms.

### `<Waveform />`

Visualisation canvas des données `AnalyserNode` (Web Audio API) pendant l'enregistrement. Dégradé de couleur synchronisé avec le timer.

### `<TranscriptDiff />`

Affiche le résultat mot par mot après un échec, avec code couleur vert/orange/rouge.

```typescript
interface TranscriptDiffProps {
  targetWords: string[]
  spokenWords: string[]
  wordScores:  number[]
}
```

### `<ScoreBoard />`

Tableau des top 10 scores pour la langue et la difficulté en cours. Rafraîchi via TanStack Query après chaque soumission.

```typescript
const { data } = useQuery({
  queryKey: ['scores', 'top', language, difficulty],
  queryFn: () => fetchTopScores({ language, difficulty }),
  staleTime: 30_000,
})
```

---

## 10. Store Zustand

```typescript
// src/store/gameStore.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface GameActions {
  selectLanguage:   (lang: Language) => void
  selectDifficulty: (diff: Difficulty) => void
  setPhrase:        (phrase: Phrase) => void
  startRecording:   () => void
  stopRecording:    () => void
  setResult:        (transcript: string, accuracy: number, wordScores: number[], elapsedMs: number) => void
  saveScore:        (playerName: string) => Promise<void>
  timeout:          () => void
  retry:            () => void
  goToLeaderboard:  () => void
  reset:            () => void
}

export const useGameStore = create<GameState & GameActions>()(
  immer((set, get) => ({
    phase:        'language_select',
    language:     null,
    difficulty:   null,
    phrase:       null,
    transcript:   '',
    accuracy:     0,
    elapsedMs:    0,
    score:        null,
    wordScores:   [],

    selectLanguage: (lang) => set(s => {
      s.language = lang
      s.phase    = 'difficulty_select'
    }),

    selectDifficulty: (diff) => set(s => {
      s.difficulty = diff
      s.phase      = 'phrase_display'
    }),

    setResult: (transcript, accuracy, wordScores, elapsedMs) => set(s => {
      const threshold = THRESHOLDS[s.language!]
      s.transcript  = transcript
      s.accuracy    = accuracy
      s.wordScores  = wordScores
      s.elapsedMs   = elapsedMs
      s.phase       = accuracy >= threshold ? 'success' : 'failure'
      if (accuracy >= threshold) {
        const remaining_s = Math.max(0, s.phrase!.timer_s - elapsedMs / 1000)
        s.score = Math.round(accuracy * 1000) + Math.floor(remaining_s) * 10
      }
    }),

    timeout: () => set(s => { s.phase = 'timeout' }),
    retry:   () => set(s => { s.phase = 'recording'; s.elapsedMs = 0 }),
    reset:   () => set(s => { Object.assign(s, initialState) }),
  }))
)
```

---

## 11. Internationalisation

### Structure des fichiers

```json
// src/i18n/fr.json
{
  "nav": {
    "leaderboard": "Classement",
    "play":        "Jouer"
  },
  "home": {
    "title":     "Virelangues",
    "subtitle":  "Prononce la phrase avant la fin du temps",
    "choose_language": "Choisis ta langue"
  },
  "game": {
    "hold_to_speak":  "Maintiens pour parler",
    "processing":     "Analyse en cours...",
    "time_up":        "Temps écoulé !",
    "try_again":      "Réessaie",
    "success":        "Bravo !",
    "save_score":     "Enregistrer mon score",
    "skip":           "Passer",
    "your_score":     "Ton score",
    "accuracy":       "Précision",
    "difficulty": {
      "easy":   "Facile",
      "medium": "Moyen",
      "hard":   "Difficile"
    }
  },
  "leaderboard": {
    "title":       "Classement",
    "player":      "Joueur",
    "score":       "Score",
    "accuracy":    "Précision",
    "time":        "Temps",
    "no_scores":   "Aucun score pour l'instant"
  },
  "errors": {
    "mic_denied":  "Accès au micro refusé. Autorise l'accès dans les réglages du navigateur.",
    "mic_unavailable": "Aucun micro détecté.",
    "api_error":   "Erreur de connexion. Réessaie dans un instant.",
    "browser_unsupported": "Ton navigateur ne supporte pas la capture audio."
  }
}
```

Les fichiers `en.json`, `ko.json`, `vi.json` ont la même structure de clés.

---

## 12. Données de seed

### Français (FR)

| Texte | Difficulté | Timer |
|-------|-----------|-------|
| Bonjour Madame | easy | 30s |
| La jolie petite Julie | easy | 30s |
| Je veux et j'exige du jasmin | easy | 30s |
| Tonton, ton thé t'a-t-il ôté ta toux ? | medium | 20s |
| Si six scies scient six cyprès | medium | 20s |
| Seize jacinthes sèchent sous seize feuilles sèches | medium | 20s |
| Un chasseur sachant chasser sait chasser sans son chien | hard | 10s |
| Les chaussettes de l'archiduchesse sont-elles sèches ou archi-sèches ? | hard | 10s |
| Didon dîna, dit-on, du dos d'un dodu dindon | hard | 10s |

### Anglais (US/UK)

| Texte | Difficulté | Timer |
|-------|-----------|-------|
| Red lorry, yellow lorry | easy | 30s |
| How much wood would a woodchuck chuck | easy | 30s |
| Betty Botter bought some butter | easy | 30s |
| She sells seashells by the seashore | medium | 20s |
| Peter Piper picked a peck of pickled peppers | medium | 20s |
| How can a clam cram in a clean cream can | medium | 20s |
| Pad kid poured curd pulled cod | hard | 10s |
| The sixth sick sheik's sixth sheep's sick | hard | 10s |
| Brisk brave brigadiers brandished broad bright blades | hard | 10s |

### Coréen (KR)

| Texte | Difficulté | Timer |
|-------|-----------|-------|
| 아버지가방에들어가신다 | easy | 30s |
| 내가 그린 기린 그림 | easy | 30s |
| 경찰청 철창살 | medium | 20s |
| 저 분은 백 법학 박사이고 이 분은 박 법학 박사이다 | medium | 20s |
| 간장 공장 공장장은 강 공장장이고 된장 공장 공장장은 장 공장장이다 | hard | 10s |
| 앞집 팥죽은 붉은 팥 팥죽이고 뒷집 팥죽은 검은 팥 팥죽이다 | hard | 10s |

### Vietnamien (VN)

| Texte | Difficulté | Timer |
|-------|-----------|-------|
| Bà ba béo bán bánh bèo | easy | 30s |
| Chú chích choè chạy chân chim | easy | 30s |
| Con kiến kiến bò lên cây kiến | medium | 20s |
| Lúa nếp là lúa nếp nàng, lúa lên lớp lớp lòng nàng lúa ơi | medium | 20s |
| Nhà Nha Trang nằm ngang nhánh núi nhỏ | hard | 10s |
| Bốn bức bình bát bằng bạc bày biện bên bờ biển | hard | 10s |

---

## 13. Compatibilité & PWA

### Compatibilité par plateforme

| Plateforme | Capture audio | Transcription | PWA installable |
|------------|---------------|---------------|-----------------|
| Chrome 90+ (desktop) | MediaRecorder + Web Speech API | Whisper + WS API | Oui |
| Firefox 86+ (desktop) | MediaRecorder | Whisper | Oui |
| Safari 15.4+ (iOS) | MediaRecorder | Whisper | Oui (Add to Home Screen) |
| Chrome Android 90+ | MediaRecorder + Web Speech API | Whisper + WS API | Oui |
| Samsung Browser 14+ | MediaRecorder | Whisper | Oui |
| Edge 90+ (desktop) | MediaRecorder + Web Speech API | Whisper + WS API | Oui |

### Configuration PWA (`vite.config.ts`)

```typescript
import { defineConfig }    from 'vite'
import react               from '@vitejs/plugin-react'
import { VitePWA }         from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name:             'Tongue Twister',
        short_name:       'VirelanguesApp',
        description:      'Jeu de virelangues multilingue',
        theme_color:      '#6366f1',
        background_color: '#0f172a',
        display:          'standalone',
        orientation:      'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.tongue-twister\.app/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 60 } },
          },
        ],
      },
    }),
  ],
})
```

### Responsive breakpoints (Tailwind v4)

```css
/* tokens définis dans app.css */
@theme {
  --breakpoint-sm:  640px;
  --breakpoint-md:  768px;
  --breakpoint-lg: 1024px;
}
```

Règles clés :
- Bouton micro : `size-14 md:size-20` (56px → 80px)
- Texte de phrase : `text-xl md:text-3xl lg:text-4xl`
- Timer bar : pleine largeur sur mobile, 640px max sur desktop
- Safe area iOS : `pb-[env(safe-area-inset-bottom)]`

---

## 14. Accessibilité

| Critère | Implémentation |
|---------|----------------|
| Contraste | Ratio ≥ 4.5:1 (WCAG AA) sur tous les textes |
| Navigation clavier | `Tab` entre les éléments, `Space`/`Enter` pour le bouton micro |
| ARIA | `aria-label` sur tous les boutons icônes, `role="timer"` sur le countdown, `aria-live="polite"` sur le transcript |
| Focus visible | Ring visible personnalisé (`focus-visible:ring-2 ring-indigo-400`) |
| Mouvement réduit | `@media (prefers-reduced-motion)` désactive les animations Motion |
| Taille tactile | Toutes les zones cliquables ≥ 44×44px (recommandation Apple/Google) |
| Screen reader | Annonce vocale du résultat (`aria-live="assertive"` sur success/failure) |

---

## 15. Sécurité

| Vecteur | Mesure |
|---------|--------|
| Rate limiting API | 30 req/min par IP via Hono middleware (`hono-rate-limiter`) |
| Validation entrées | Zod sur tous les body/query (longueur max, enum strict) |
| Vérification score | Score recalculé côté serveur, rejeté si écart > 5% |
| Nom joueur | Sanitisé, max 30 caractères, pas de HTML |
| Fichier audio | Max 10 Mo, MIME type vérifié, rejeté si hors plage |
| CORS | `allowedOrigins: ['https://tongue-twister.app']` en production |
| Headers | `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` via Hono `secureHeaders()` |
| Clé OpenAI | Jamais exposée côté client — proxy uniquement via le backend |

---

## 16. Performance

### Cibles

| Métrique | Cible |
|----------|-------|
| First Contentful Paint | < 1.2 s |
| Time to Interactive | < 2.5 s |
| Latence Whisper (bonne connexion) | < 2 s |
| Latence DB (Turso edge) | < 10 ms |
| Bundle JS gzippé | < 150 Ko |
| Score Lighthouse mobile | ≥ 90 |

### Stratégies

- **Code splitting** : chaque route est un chunk Vite (lazy import)
- **Prefetch phrases** : les phrases de la difficulté choisie sont prefetchées au choix de langue
- **Cache TanStack Query** : `staleTime: 5min` pour les phrases, `30s` pour le leaderboard
- **Optimistic update** : le score s'affiche immédiatement, POST en arrière-plan
- **Images WebP** : drapeaux et icônes en SVG ou WebP, `loading="lazy"`
- **Font subsetting** : uniquement les glyphes utilisés (latin + hangul + vietnamien)

---

## 17. Tests

### Stratégie

```
Pyramide de tests
                    /\
                   /e2e\     Playwright (happy path + mobile)
                  /──────\
                 / intégr \   Vitest + supertest (routes API)
                /──────────\
               /  unitaire  \ Vitest (computeAccuracy, score formula, hooks)
              ──────────────────
```

### Tests unitaires clés

```typescript
// computeAccuracy
it('retourne 1.0 pour une correspondance exacte', () => {
  expect(computeAccuracy('un chasseur sachant', 'un chasseur sachant')).toBeCloseTo(1.0)
})
it('est robuste aux diacritiques', () => {
  expect(computeAccuracy('un chasseur sachant', 'un chasséur sachànt')).toBeGreaterThan(0.9)
})
it('retourne < seuil pour un texte très différent', () => {
  expect(computeAccuracy('bonjour monde', 'un chasseur sachant chasser')).toBeLessThan(0.5)
})

// score formula
it('calcule correctement le score', () => {
  expect(computeScore(0.95, 12_000, 20)).toBe(950 + 80)
})
```

### Tests e2e Playwright

```typescript
test('parcours complet — joueur réussit en français', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="lang-fr"]')
  await page.click('[data-testid="difficulty-easy"]')
  // simulation audio mockée via page.evaluate()
  await page.click('[data-testid="mic-button"]')
  await page.waitForSelector('[data-testid="success-screen"]')
  await page.fill('[data-testid="player-name"]', 'TestPlayer')
  await page.click('[data-testid="save-score"]')
  await expect(page.locator('[data-testid="leaderboard"]')).toBeVisible()
})
```

---

## 18. Déploiement

### Architecture de production

```
Cloudflare Pages       Cloudflare Workers       Turso (LibSQL)
   (frontend)       ←───  (backend Hono)   ←───  (database)
  tongue-twister.app    api.tongue-twister.app   ams.turso.io
```

### Variables d'environnement — Production

**Backend (Cloudflare Workers / Secrets) :**

```
OPENAI_API_KEY     = sk-...
DATABASE_URL       = libsql://[db-name]-[org].turso.io
TURSO_AUTH_TOKEN   = eyJ...
CORS_ORIGIN        = https://tongue-twister.app
```

**Frontend (Cloudflare Pages / Env vars) :**

```
VITE_API_URL = https://api.tongue-twister.app
```

### Commandes de déploiement

```bash
# Backend → Cloudflare Workers
cd api
bun run build
bunx wrangler deploy

# Frontend → Cloudflare Pages (CI/CD automatique sur push main)
cd app
bun run build
bunx wrangler pages deploy dist --project-name tongue-twister

# Migrations DB production
bunx drizzle-kit migrate --config drizzle.config.ts
```

### `wrangler.toml` (backend)

```toml
name            = "tongue-twister-api"
main            = "dist/index.js"
compatibility_date = "2026-01-01"

[vars]
CORS_ORIGIN = "https://tongue-twister.app"

[[d1_databases]]
binding      = "DB"
database_name = "tongue-twister-prod"
database_id  = "..."
```

---

## 19. Jalons de développement

| # | Nom | Durée estimée | Livrables clés |
|---|-----|---------------|----------------|
| **M1** | Infrastructure backend | 3 jours | Bun + Hono init, Drizzle schema, migrations, seed data, routes `/phrases` + `/scores`, Scalar docs, tests unitaires routes |
| **M2** | Infrastructure frontend | 2 jours | Vite + React 19, Tailwind v4, TanStack Router (3 routes), Zustand store, i18n 4 langues, PWA manifest + icônes |
| **M3** | Pipeline audio | 4 jours | `useSpeech` hook (MediaRecorder + Whisper), proxy `/speech/transcribe` backend, Web Speech API fallback, `<Waveform />` |
| **M4** | Timer de jeu | 2 jours | `useGameTimer` hook, `<GameTimer />` animé, timeout flow, vibration API, intégration store |
| **M5** | Validation & score | 3 jours | `computeAccuracy()` (Jaro-Winkler), `<TranscriptDiff />`, machine d'état complète, `<MicButton />` états visuels, score + POST `/scores` |
| **M6** | Leaderboard & sélecteurs | 2 jours | `<ScoreBoard />`, `<LanguagePicker />`, `<DifficultyPicker />`, TanStack Query cache |
| **M7** | QA cross-device | 3 jours | Tests Playwright (Chrome/Firefox/Safari iOS/Android), accessibilité WCAG AA, Lighthouse ≥ 90, retours utilisateurs |
| **M8** | Déploiement | 1 jour | Cloudflare Workers (API) + Pages (front), Turso prod, CI/CD GitHub Actions, monitoring Sentry |

**Total estimé : ~20 jours de développement**

---

## 20. Roadmap v2

| Fonctionnalité | Description |
|----------------|-------------|
| **Mode défi** | Série de 5 phrases à la suite, score cumulé, sans retry |
| **Multijoueur** | Même phrase, même timer, résultats en temps réel via WebSocket |
| **Analyse phonémique** | Utiliser l'API de phonèmes de Whisper pour le feedback plus précis (notamment les tons vietnamiens) |
| **Profil joueur** | Historique des parties, statistiques par langue, badges |
| **Contribution** | Interface pour soumettre de nouvelles phrases (moderée) |
| **Synthèse vocale** | Bouton "écouter la prononciation correcte" via Web Speech Synthesis API |
| **Offline mode** | Mise en cache des phrases via Workbox, jeu sans connexion (sans Whisper → Web Speech API only) |
| **Classement mondial** | Tournois hebdomadaires par langue |
