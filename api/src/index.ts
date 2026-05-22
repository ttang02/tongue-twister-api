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

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',')

const app = new Elysia({ adapter: node() })

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
