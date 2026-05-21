import { Elysia, t } from 'elysia'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { phrases } from '../db/schema'

const langEnum   = t.Union([t.Literal('fr'), t.Literal('en'), t.Literal('ko'), t.Literal('vi')])
const countryEnum = t.Union([t.Literal('FR'), t.Literal('US'), t.Literal('KR'), t.Literal('VN')])
const diffEnum   = t.Union([t.Literal('easy'), t.Literal('medium'), t.Literal('hard')])

export const phrasesRoute = new Elysia({ prefix: '/phrases' })

  .get('/', async ({ query }) => {
    const { lang, difficulty, limit, offset } = query

    const conditions = [
      lang       ? eq(phrases.language,   lang)       : undefined,
      difficulty ? eq(phrases.difficulty, difficulty) : undefined,
    ].filter(Boolean) as any[]

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [data, countResult] = await Promise.all([
      db.select().from(phrases).where(where).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(phrases).where(where),
    ])

    return { data, total: countResult[0]?.count ?? 0, limit, offset }
  }, {
    query: t.Object({
      lang:       t.Optional(langEnum),
      difficulty: t.Optional(diffEnum),
      limit:      t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
      offset:     t.Optional(t.Numeric({ minimum: 0, default: 0 })),
    }),
  })

  .get('/:id', async ({ params, error }) => {
    const id = Number(params.id)
    if (isNaN(id)) return error(400, { error: 'Invalid id' })

    const row = await db.select().from(phrases).where(eq(phrases.id, id)).get()
    if (!row) return error(404, { error: 'Phrase not found' })

    return row
  }, {
    params: t.Object({ id: t.String() }),
  })

  .post('/', async ({ body, set }) => {
    const result = await db.insert(phrases).values(body as any).returning({ id: phrases.id })
    set.status = 201
    return { id: result[0]!.id }
  }, {
    body: t.Object({
      language:   langEnum,
      country:    countryEnum,
      text:       t.String({ minLength: 3, maxLength: 300 }),
      difficulty: diffEnum,
      timer_s:    t.Integer({ minimum: 5, maximum: 60 }),
    }),
  })
