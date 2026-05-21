import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { phrases } from '../db/schema'

const app = new Hono()

const querySchema = z.object({
  lang:       z.enum(['fr', 'en', 'ko', 'vi']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  offset:     z.coerce.number().int().min(0).default(0),
})

const phraseBodySchema = z.object({
  language:   z.enum(['fr', 'en', 'ko', 'vi']),
  country:    z.enum(['FR', 'US', 'KR', 'VN']),
  text:       z.string().min(3).max(300).trim(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  timer_s:    z.number().int().min(5).max(60),
})

app.get('/', zValidator('query', querySchema), async (c) => {
  const { lang, difficulty, limit, offset } = c.req.valid('query')

  const conditions = [
    lang       ? eq(phrases.language,   lang)       : undefined,
    difficulty ? eq(phrases.difficulty, difficulty) : undefined,
  ].filter(Boolean) as any[]

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [data, countResult] = await Promise.all([
    db.select().from(phrases).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(phrases).where(where),
  ])

  return c.json({ data, total: countResult[0]?.count ?? 0, limit, offset })
})

app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

  const row = await db.select().from(phrases).where(eq(phrases.id, id)).get()
  if (!row) return c.json({ error: 'Phrase not found' }, 404)

  return c.json(row)
})

app.post('/', zValidator('json', phraseBodySchema), async (c) => {
  const body = c.req.valid('json')
  const result = await db.insert(phrases).values(body).returning({ id: phrases.id })
  return c.json({ id: result[0]!.id }, 201)
})

export default app
