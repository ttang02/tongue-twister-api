# Tongue Twister Game

Un jeu de virelangues multilingue où le joueur prononce des phrases dans son micro. L'application transcrit la voix en temps réel via **Groq Whisper** (< 300 ms), valide la prononciation, et attribue un score basé sur la précision et le temps restant. Supporte le français, l'anglais, le coréen et le vietnamien.

---

## Fonctionnalités

- **Micro intégré** — MediaRecorder API → Groq Whisper (< 300 ms), Web Speech API en fallback live
- **Timer de jeu** — compte à rebours par difficulté (30 s / 20 s / 10 s), barre animée avec glow
- **Validation stricte** — seuil de précision par langue, pas de score si raté
- **Score** — précision × 1000 + bonus temps, count-up animé, leaderboard avec médailles 🥇🥈🥉
- **Thème par langue** — fond et accents changent : bleu 🇫🇷 / rouge 🇺🇸 / jaune 🇰🇷 / vert 🇻🇳
- **84 virelangues** — 3 difficultés × 4 langues, base extensible
- **PWA** — installable sur iOS, Android, desktop, fonctionne sur tous les navigateurs
- **Onboarding** — tutoriel 3 slides au premier lancement, ré-ouvrable via `?` dans le header

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, Vite 6, TypeScript 5, Tailwind CSS v4 |
| Routing | TanStack Router v1 (file-based, type-safe) |
| State | Zustand v5 + immer |
| Data | TanStack Query v5 |
| Animation | Motion v12 (Framer Motion) |
| i18n | react-i18next + détection automatique |
| PWA | vite-plugin-pwa + Workbox |
| Backend | **Node.js ≥ 18** + **Elysia.js** v1.3 |
| Validation | TypeBox natif Elysia |
| ORM | Drizzle ORM |
| Base de données | SQLite (`better-sqlite3`) en dev · Turso LibSQL en prod |
| Speech | MediaRecorder + **Groq Whisper** `whisper-large-v3-turbo` |
| TypeScript runtime | `tsx` (dev) |

---

## Démarrage rapide

### Prérequis

- **Node.js** >= 18 — [nodejs.org](https://nodejs.org)
- **npm** >= 9 (inclus avec Node.js) — ou **pnpm** / **yarn**
- Clé API **Groq** (gratuite) — [console.groq.com](https://console.groq.com)

### Installation & lancement

```bash
git clone https://github.com/ttang02/tongue-twister-api.git
cd tongue-twister-api

# 1. Installer les dépendances root
npm install

# 2. Créer les fichiers .env
cp api/.env.example api/.env      # → renseigner GROQ_API_KEY
cp app/.env.example app/.env

# 3. Installer les dépendances + migrer + seeder la BDD
npm run setup

# 4. Lancer backend + frontend simultanément
npm run dev
```

- **API** → `http://localhost:3000`
- **App** → `http://localhost:5173`
- **Docs API** → `http://localhost:3000/docs` (Scalar / OpenAPI)

### Avec pnpm

```bash
# Remplacer npm par pnpm partout
pnpm install
pnpm run setup
pnpm run dev
```

### Variables d'environnement

**`api/.env`**
```env
GROQ_API_KEY=gsk_...          # Clé Groq (obligatoire)
DATABASE_URL=file:./dev.db    # SQLite local
TURSO_AUTH_TOKEN=             # Laisser vide en dev
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**`app/.env`**
```env
VITE_API_URL=http://localhost:3000
```

---

## Scripts racine

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance API + App en parallèle avec logs colorés |
| `npm run setup` | Install + migration BDD + seed (premier démarrage) |
| `npm run dev:api` | API seule |
| `npm run dev:app` | App seule |

### Scripts backend (`api/`)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur en mode watch (tsx watch) |
| `npm run start` | Serveur sans watch (production) |
| `npm run db:generate` | Génère les migrations Drizzle |
| `npm run db:migrate` | Applique les migrations |
| `npm run db:seed` | Insère les 84 phrases de démo |
| `npm run db:studio` | Drizzle Studio (UI base de données) |

### Scripts frontend (`app/`)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Dev server avec HMR |
| `npm run build` | Build optimisé prod |
| `npm run preview` | Prévisualise le build |
| `npm run test` | Vitest |

---

## Structure du projet

```
tongue-twister-api/
├── package.json          ← scripts racine (dev, setup)
│
├── api/                  ← backend Elysia.js (Node.js)
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts     Drizzle schema (phrases + scores)
│   │   │   ├── client.ts     better-sqlite3 + WAL
│   │   │   ├── migrate.ts
│   │   │   └── seed.ts       84 phrases (fr/en/ko/vi × easy/medium/hard)
│   │   ├── routes/
│   │   │   ├── phrases.ts    GET /phrases, GET /phrases/:id, POST /phrases
│   │   │   ├── scores.ts     GET /scores, POST /scores, GET /scores/top
│   │   │   └── speech.ts     POST /speech/transcribe → Groq Whisper
│   │   └── index.ts          entrée Elysia + CORS + Scalar docs
│   ├── drizzle.config.ts
│   └── tsconfig.json
│
└── app/                  ← frontend React 19
    ├── src/
    │   ├── components/
    │   │   ├── PhraseCard.tsx       glassmorphism + quote marks colorés
    │   │   ├── MicButton.tsx        96px, ripple, états visuels complets
    │   │   ├── GameTimer.tsx        barre glow dual-layer, haptic 5s
    │   │   ├── TranscriptDiff.tsx   chips ✓/~/✗ par mot
    │   │   ├── ScoreBoard.tsx       🥇🥈🥉 + barre de score + skeleton
    │   │   ├── Confetti.tsx         canvas particles au succès
    │   │   ├── Onboarding.tsx       3 slides glassmorphism
    │   │   ├── LanguagePicker.tsx   cartes colorées par langue
    │   │   └── DifficultyPicker.tsx slide-in avec icônes colorées
    │   ├── hooks/
    │   │   ├── useSpeech.ts         MediaRecorder + Whisper + Web Speech API
    │   │   ├── useGameTimer.ts      rAF countdown pause/resume
    │   │   ├── useAccuracy.ts       Jaro-Winkler word-by-word
    │   │   ├── useCountUp.ts        animation count-up du score
    │   │   └── useOnboarding.ts     localStorage first-launch
    │   ├── constants/
    │   │   └── themes.ts            palettes par langue (RGB vars CSS)
    │   ├── routes/
    │   │   ├── __root.tsx           layout + header + onboarding
    │   │   ├── index.tsx            sélection langue + difficulté
    │   │   ├── game.tsx             boucle de jeu complète
    │   │   └── leaderboard.tsx      classement filtrable
    │   ├── store/
    │   │   └── gameStore.ts         machine d'état Zustand
    │   └── i18n/
    │       ├── fr.json  en.json  ko.json  vi.json
    └── vite.config.ts
```

---

## Compatibilité navigateurs

| Navigateur | Capture audio | Transcription | PWA |
|------------|---------------|---------------|-----|
| Chrome / Edge | ✅ | Groq + Web Speech API live | ✅ |
| Firefox | ✅ | Groq uniquement | ✅ |
| Safari iOS 14+ | ✅ | Groq uniquement | ✅ Add to Home Screen |
| Chrome Android | ✅ | Groq + Web Speech API live | ✅ |
| Samsung Browser | ✅ | Groq uniquement | ✅ |

---

## Dépannage

### `better-sqlite3` ne compile pas

Ce module est natif (C++). Si l'installation échoue :

```bash
# Installer les outils de compilation (Linux/Debian)
sudo apt install python3 make g++ -y
npm install

# macOS — installer Xcode Command Line Tools
xcode-select --install
npm install

# Windows — installer windows-build-tools
npm install --global windows-build-tools
npm install
```

### Port déjà utilisé

```bash
# Changer le port de l'API
echo "PORT=3001" >> api/.env
# Puis mettre à jour app/.env
echo "VITE_API_URL=http://localhost:3001" >> app/.env
```

### La clé Groq est invalide

Créer un compte gratuit sur [console.groq.com](https://console.groq.com), générer une clé API et la mettre dans `api/.env` :
```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

---

## Documentation complète

Voir [PROJECT.md](./PROJECT.md) — spécification technique complète (20 sections) : architecture, pipeline audio, machine d'état, contrats API, schéma DB, accessibilité, sécurité, déploiement.
