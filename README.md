# Tongue Twister Game

Un jeu de virelangues multilingue où le joueur prononce des phrases dans son micro. L'application transcrit la voix en temps réel via **Web Speech API**, valide la prononciation mot-à-mot (Jaro-Winkler), et attribue un score basé sur la précision et le temps restant. Supporte le français, l'anglais, le coréen et le vietnamien — aucune clé API requise.

---

## Fonctionnalités

- **Micro intégré** — Web Speech API (reconnaissance vocale temps réel, aucune clé API)
- **Timer de jeu** — compte à rebours par difficulté (30 s / 20 s / 10 s), barre animée scaleX avec glow
- **Validation stricte** — seuil de précision par langue, pas de score si raté
- **Score** — précision × multiplicateur difficulté (×1.0 / ×1.5 / ×2.5) + bonus temps, count-up animé
- **Leaderboard** — classement avec médailles 🥇🥈🥉, filtrable par difficulté, détection doublons
- **TTS automatique** — prononciation de la phrase après chaque tentative : Web Speech API (fr/en/ko) + Google Translate TTS via proxy serveur (vi)
- **Colorisation mot-à-mot** — feedback en temps réel pendant l'enregistrement (vert ✓ / orange ~ / rouge ✗) via Jaro-Winkler
- **Progression de difficulté** — suggestion automatique de monter en difficulté après une série de succès (streak)
- **Thème par langue** — fond et accents changent : bleu 🇫🇷 / rouge 🇺🇸 / jaune 🇰🇷 / vert 🇻🇳
- **84 virelangues** — 3 difficultés × 4 langues, base extensible
- **PWA** — installable sur iOS, Android, desktop, fonctionne sur tous les navigateurs
- **Onboarding** — tutoriel 3 slides au premier lancement, ré-ouvrable via `?` dans le header
- **Rate limiting** — 30 POST/min par IP côté serveur
- **Error boundary** — capture d'erreurs React avec fallback gracieux

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
| Speech-to-Text | **Web Speech API** (Chrome, Edge, Android — natif, gratuit) |
| Text-to-Speech | Web Speech API (fr/en/ko) · Google Translate TTS proxy (vi) |
| TypeScript runtime | `tsx` (dev) |

---

## Démarrage rapide

### Prérequis

- **Node.js** >= 18 — [nodejs.org](https://nodejs.org)
- **npm** >= 9 (inclus avec Node.js) — ou **pnpm** / **yarn**
- **Chrome** ou **Edge** (Web Speech API requise pour la reconnaissance vocale)

### Installation & lancement

```bash
git clone https://github.com/ttang02/tongue-twister-api.git
cd tongue-twister-api

# 1. Installer les dépendances root
npm install

# 2. Créer les fichiers .env
cp api/.env.example api/.env
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
│   │   │   ├── scores.ts     GET /scores, POST /scores, GET /scores/top, GET /scores/players
│   │   │   └── speech.ts     GET /speech/tts → Google Translate TTS proxy (vi)
│   │   └── index.ts          entrée Elysia + CORS + Scalar docs
│   ├── drizzle.config.ts
│   └── tsconfig.json
│
└── app/                  ← frontend React 19
    ├── src/
    │   ├── components/
    │   │   ├── PhraseCard.tsx       glassmorphism + coloration mot-à-mot live
    │   │   ├── MicButton.tsx        96px, blur crossfade icons, press feedback
    │   │   ├── GameTimer.tsx        barre scaleX glow dual-layer, haptic 5s
    │   │   ├── ScoreBoard.tsx       🥇🥈🥉 + barre de score + skeleton
    │   │   ├── Confetti.tsx         canvas particles + prefers-reduced-motion
    │   │   ├── ErrorBoundary.tsx    React error boundary avec fallback
    │   │   ├── Onboarding.tsx       3 slides glassmorphism
    │   │   ├── LanguagePicker.tsx   cartes colorées par langue
    │   │   └── DifficultyPicker.tsx slide-in avec icônes colorées
    │   ├── hooks/
    │   │   ├── useSpeech.ts         Web Speech API (reconnaissance vocale)
    │   │   ├── useGameTimer.ts      rAF countdown pause/resume
    │   │   ├── useAccuracy.ts       Jaro-Winkler DP alignment + expandCompounds
    │   │   ├── useTTS.ts            TTS: Web Speech API (fr/en/ko) + server proxy (vi)
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

| Navigateur | Reconnaissance vocale | TTS | PWA |
|------------|----------------------|-----|-----|
| Chrome / Edge | ✅ Web Speech API | ✅ | ✅ |
| Chrome Android | ✅ Web Speech API | ✅ | ✅ |
| Firefox | ❌ non supporté | ✅ (vi via proxy) | ✅ |
| Safari iOS 14+ | ❌ non supporté | ✅ (vi via proxy) | ✅ |
| Samsung Browser | ❌ non supporté | ✅ (vi via proxy) | ✅ |

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

### La reconnaissance vocale ne fonctionne pas

Web Speech API nécessite **Chrome** ou **Edge** (desktop ou mobile). Firefox et Safari ne supportent pas cette API. Vérifier aussi que le micro est autorisé dans les paramètres du navigateur.

---

## Documentation complète

Voir [PROJECT.md](./PROJECT.md) — spécification technique complète (20 sections) : architecture, pipeline audio, machine d'état, contrats API, schéma DB, accessibilité, sécurité, déploiement.
