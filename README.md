# Tongue Twister Game

Un jeu de virelangues multlingue où le joueur prononce des phrases dans son micro. L'application transcrit la voix en temps réel, valide la prononciation, et attribue un score basé sur la précision et le temps restant. Supporte le français, l'anglais, le coréen et le vietnamien.

---

## Fonctionnalités

- **Micro intégré** — capture audio via MediaRecorder API, transcription par Groq Whisper (< 300 ms)
- **Timer de jeu** — compte à rebours par difficulté (30 s / 20 s / 10 s), animé en temps réel
- **Validation stricte** — la phrase doit être reconnue avec un seuil de précision ; sinon on recommence, sans score enregistré
- **Score** — calculé sur la précision et le temps restant à la validation
- **Leaderboard** — classement par langue et par difficulté
- **Multilingue** — 4 langues : 🇫🇷 Français, 🇺🇸 English, 🇰🇷 한국어, 🇻🇳 Tiếng Việt
- **PWA** — installable sur mobile et desktop, fonctionne sur tous les navigateurs

---

## Stack technique

| Couche    | Technologie                                              |
|-----------|----------------------------------------------------------|
| Frontend  | React 19, Vite 6, TypeScript 5, Tailwind CSS v4          |
| Routing   | TanStack Router v1                                       |
| State     | Zustand v5                                               |
| Data      | TanStack Query v5                                        |
| Animation | Motion v12 (Framer Motion)                               |
| i18n      | react-i18next                                            |
| PWA       | vite-plugin-pwa                                          |
| Backend   | Bun + **Elysia.js**                                      |
| ORM       | Drizzle ORM                                              |
| Base de données | SQLite (dev) / Turso LibSQL (prod)                 |
| Speech    | MediaRecorder API + **Groq Whisper** (< 300 ms), Web Speech API (fallback) |

---

## Prérequis

- [Bun](https://bun.sh) >= 1.1 — runtime backend et frontend
- [Node.js](https://nodejs.org) >= 20 (optionnel, si Bun absent)
- Une clé API [OpenAI](https://platform.openai.com) pour Whisper
- Une base [Turso](https://turso.tech) (optionnel, SQLite local en dev)

---

## Installation locale

### 1. Cloner le monorepo

```bash
git clone https://github.com/ttang02/tongue-twister-api.git
cd tongue-twister-api
```

### 2. Backend (`/api`)

```bash
cd api
cp .env.example .env
```

Renseigner le fichier `.env` :

```env
GROQ_API_KEY=gsk_...
DATABASE_URL=file:./dev.db        # SQLite local
# DATABASE_URL=libsql://...       # Turso en prod
TURSO_AUTH_TOKEN=                 # laisser vide en dev
PORT=3000
```

Installer les dépendances et lancer :

```bash
bun install
bun run db:migrate                # crée les tables
bun run db:seed                   # insère les virelangues de base
bun run dev                       # démarre sur http://localhost:3000
```

### 3. Frontend (`/app`)

```bash
cd ../app
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000
```

```bash
bun install
bun run dev                       # démarre sur http://localhost:5173
```

---

## Scripts disponibles

### Backend

| Commande            | Description                          |
|---------------------|--------------------------------------|
| `bun run dev`       | Serveur en mode watch                |
| `bun run build`     | Build de production                  |
| `bun run start`     | Démarre le build de production       |
| `bun run db:migrate`| Applique les migrations Drizzle      |
| `bun run db:seed`   | Insère les phrases de démo           |
| `bun run db:studio` | Ouvre Drizzle Studio (UI base de données) |

### Frontend

| Commande          | Description                            |
|-------------------|----------------------------------------|
| `bun run dev`     | Dev server avec HMR                    |
| `bun run build`   | Build optimisé pour la prod            |
| `bun run preview` | Prévisualise le build en local         |
| `bun run test`    | Lance Vitest                           |
| `bun run e2e`     | Lance les tests Playwright             |

---

## Structure du projet

```
tongue-twister-api/     ← ce repo
├── api/                ← backend Hono.js
│   ├── src/
│   │   ├── routes/
│   │   │   ├── phrases.ts
│   │   │   └── scores.ts
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   └── seed.ts
│   │   └── index.ts
│   └── drizzle.config.ts
│
└── app/                ← frontend React 19
    ├── src/
    │   ├── components/
    │   │   ├── PhraseCard.tsx
    │   │   ├── MicButton.tsx
    │   │   ├── GameTimer.tsx
    │   │   ├── Waveform.tsx
    │   │   └── ScoreBoard.tsx
    │   ├── hooks/
    │   │   ├── useSpeech.ts
    │   │   └── useGameTimer.ts
    │   ├── routes/
    │   │   ├── index.tsx
    │   │   ├── game.tsx
    │   │   └── leaderboard.tsx
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

## Compatibilité navigateurs

| Navigateur        | Capture audio | Reconnaissance vocale     |
|-------------------|---------------|---------------------------|
| Chrome / Edge     | ✅            | Whisper + Web Speech API  |
| Firefox           | ✅            | Whisper uniquement        |
| Safari (iOS 14+)  | ✅            | Whisper uniquement        |
| Chrome Android    | ✅            | Whisper + Web Speech API  |
| Samsung Browser   | ✅            | Whisper uniquement        |

> Un message d'avertissement s'affiche si le micro est refusé ou indisponible.

---

## Documentation complète

Voir [PROJECT.md](./PROJECT.md) pour la spécification détaillée : flux de jeu, schéma de base de données, routes API, jalons de développement.
