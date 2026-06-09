import { Elysia } from 'elysia'
import { node }    from '@elysiajs/node'
import { cors }    from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { db }      from './db/client'
import { phrasesRoute } from './routes/phrases'
import { scoresRoute }  from './routes/scores'
import { speechRoute }  from './routes/speech'

// Auto-apply pending migrations on startup
await migrate(db, { migrationsFolder: './drizzle' }).catch(e =>
  console.warn('[migrate] warning:', e)
)

// Simple in-memory rate limiter: max 30 POST req/min per IP
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, maxPerMin = 30): boolean {
  const now   = Date.now()
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

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',')

const app = new Elysia({ adapter: node() })

  .onRequest(({ request, set }) => {
    if (request.method === 'POST') {
      // Behind a Cloudflare tunnel the real client IP is in cf-connecting-ip;
      // x-forwarded-for may be a list (take first) and is 127.0.0.1 via the local proxy.
      const ip =
        request.headers.get('cf-connecting-ip') ??
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        'unknown'
      if (!checkRateLimit(ip, 30)) {
        set.status = 429
        return { error: 'Too many requests — réessaie dans une minute' }
      }
    }
  })

  .use(cors({
    origin:  (request) => {
      const origin = request.headers.get('origin') ?? ''
      return allowedOrigins.includes(origin)
    },
    methods:         ['GET', 'POST', 'OPTIONS'],
    allowedHeaders:  ['Content-Type'],
    maxAge:          600,
  }))

  .use(swagger({
    documentation: {
      info: {
        title:       'Tongue Twister API',
        version:     '1.0.0',
        description: 'Multilingual tongue twister game — phrases, scores & speech transcription',
      },
      tags: [
        { name: 'phrases', description: 'Tongue twister library' },
        { name: 'scores',  description: 'Leaderboard & score submission' },
        { name: 'speech',  description: 'Audio transcription via Groq Whisper' },
      ],
    },
    path: '/docs',
  }))

  .get('/', () => ({ status: 'ok', version: '1.0.0', runtime: 'node + elysia' }))

  .use(phrasesRoute)
  .use(scoresRoute)
  .use(speechRoute)

  .onError(({ error, code }) => {
    console.error(`[${code}]`, error)
    return { error: 'Internal server error' }
  })

  .listen(Number(process.env.PORT ?? 3000))

console.log(`Server running on http://localhost:${app.server?.port}`)
