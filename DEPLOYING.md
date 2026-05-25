# Deploying to Production

The stack is a Node.js API + a static SPA. Any platform that runs Node 18+ works for the API; the frontend is a plain Vite build that can be served from any CDN or static host.

Recommended combination: **Railway** (API) + **Vercel** (frontend) — both have free tiers and zero-config Node/Vite support.

---

## 1. Database — Turso (LibSQL)

The API uses `@libsql/client` which connects to SQLite locally and Turso in production — no code change required.

```bash
# Install Turso CLI
curl -sSfL https://get.turso.tech | bash

# Log in
turso auth login

# Create a database
turso db create tongue-twister

# Get the connection URL
turso db show tongue-twister --url
# → libsql://tongue-twister-<org>.turso.io

# Create an auth token
turso db tokens create tongue-twister
# → eyJhbGci...
```

Keep both values — you will need them as environment variables.

### Run migrations against Turso

```bash
cd api
DATABASE_URL="libsql://tongue-twister-<org>.turso.io" \
TURSO_AUTH_TOKEN="<token>" \
npm run db:migrate

# Seed with the 84 phrases
DATABASE_URL="libsql://tongue-twister-<org>.turso.io" \
TURSO_AUTH_TOKEN="<token>" \
npm run db:seed
```

---

## 2. API — Railway

1. Go to [railway.app](https://railway.app) → **New project** → **Deploy from GitHub repo**
2. Select this repository, root directory: `api/`
3. Railway auto-detects Node.js. Set the start command to:
   ```
   npm run start
   ```
4. Add environment variables in the Railway dashboard:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `libsql://tongue-twister-<org>.turso.io` |
   | `TURSO_AUTH_TOKEN` | `<token from step 1>` |
   | `PORT` | `3000` (Railway injects this automatically) |
   | `CORS_ORIGIN` | `https://<your-frontend>.vercel.app` |

5. Deploy. Railway gives you a URL like `https://tongue-twister-api-production.up.railway.app`.

### Alternative: Fly.io

```bash
cd api
fly launch          # follow prompts, choose region
fly secrets set DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." CORS_ORIGIN="https://..."
fly deploy
```

---

## 3. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo
2. Set **Root Directory** to `app`
3. Vercel detects Vite automatically. Override if needed:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
4. Add the environment variable:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://<railway-app>.up.railway.app` |

5. Deploy. Vercel gives you a URL like `https://tongue-twister.vercel.app`.

### Update CORS on the API

Go back to the Railway dashboard and set `CORS_ORIGIN` to the Vercel URL:
```
CORS_ORIGIN=https://tongue-twister.vercel.app
```

### Alternative: Netlify

```bash
cd app
npm run build
# drag-drop the dist/ folder to netlify.com, or:
netlify deploy --prod --dir dist
```

Set `VITE_API_URL` in **Site settings → Environment variables**.

---

## 4. Production checklist

- [ ] Turso DB migrated and seeded (`npm run db:migrate && npm run db:seed`)
- [ ] API `CORS_ORIGIN` matches the frontend URL exactly (no trailing slash)
- [ ] `VITE_API_URL` set in frontend build environment (Vercel / Netlify)
- [ ] App loads at the Vercel URL and the phrase count appears on the home screen
- [ ] Score submission works (POST /scores returns 201)
- [ ] TTS works for Vietnamese (GET /speech/tts?text=xin+chào&lang=vi returns audio)
- [ ] Web Speech API prompts for mic permission in Chrome / Edge

---

## Environment variables reference

### API (`api/.env` in dev, platform secrets in prod)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `file:./dev.db` locally · `libsql://...` in prod |
| `TURSO_AUTH_TOKEN` | Prod only | Leave empty in dev |
| `PORT` | No | Default `3000`; injected by Railway / Fly |
| `CORS_ORIGIN` | Yes | Exact frontend origin, no trailing slash |

### Frontend (`app/.env` in dev, platform env in prod)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Full API origin, no trailing slash |
