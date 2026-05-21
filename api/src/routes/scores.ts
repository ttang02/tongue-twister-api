import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { scores, phrases } from '../db/schema'

const app = new Hono()

const querySchema = z.object({
  lang:       z.enum(['fr', 'en', 'ko', 'vi']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  phrase_id:  z.coerce.number().int().optional(),
  limit:      z.coerce.number().int().min(1).max(200).default(50),
})

const scoreBodySchema = z.object({
  phrase_id:   z.number().int().positive(),
  player_name: z.string().min(1).max(30).trim(),
  elapsed_ms:  z.number().int().min(0),
  accuracy:    z.number().min(0).max(1),
})

app.get('/', zValidator('query', querySchema), async (c) => {
  const { lang, difficulty, phrase_id, limit } = c.req.valid('query')

  const rows = await db
    .select({
      id:          scores.id,
      phrase_id:   scores.phrase_id,
      player_name: scores.player_name,
      elapsed_ms:  scores.elapsed_ms,
      accuracy:    scores.accuracy,
      score:       scores.score,
      created_at:  scores.created_at,
      phrase_text: phrases.text,
      language:    phrases.language,
      difficulty:  phrases.difficulty,
    })
    .from(scores)
    .innerJoin(phrases, eq(scores.phrase_id, phrases.id))
    .where(
      and(
        lang       ? eq(phrases.language,   lang)       : undefined,
        difficulty ? eq(phrases.difficulty, difficulty) : undefined,
        phrase_id  ? eq(scores.phrase_id,   phrase_id)  : undefined,
      )
    )
    .orderBy(desc(scores.score))
    .limit(limit)

  return c.json({ data: rows, total: rows.length })
})

app.post('/', zValidator('json', scoreBodySchema), async (c) => {
  const body = c.req.valid('json')

  const phrase = await db.select().from(phrases).where(eq(phrases.id, body.phrase_id)).get()
  if (!phrase) return c.json({ error: 'Phrase not found' }, 404)

  // Recalculate score server-side to prevent cheating
  const remaining_s  = Math.max(0, phrase.timer_s - body.elapsed_ms / 1000)
  const serverScore  = Math.round(body.accuracy * 1000) + Math.floor(remaining_s) * 10

  const sanitizedName = body.player_name.replace(/[<>&"]/g, '')

  const result = await db.insert(scores).values({
    phrase_id:   body.phrase_id,
    player_name: sanitizedName,
    elapsed_ms:  body.elapsed_ms,
    accuracy:    body.accuracy,
    score:       serverScore,
  }).returning({ id: scores.id })

  // Compute rank for this language
  const rank = await db
    .select({ count: sql<number>`count(*)` })
    .from(scores)
    .innerJoin(phrases, eq(scores.phrase_id, phrases.id))
    .where(
      and(
        eq(phrases.language, phrase.language),
        sql`${scores.score} > ${serverScore}`
      )
    )
    .get()

  return c.json({ id: result[0]!.id, score: serverScore, rank: (rank?.count ?? 0) + 1 }, 201)
})

app.get('/top', async (c) => {
  const langs = ['fr', 'en', 'ko', 'vi'] as const
  const top: Record<string, unknown[]> = {}

  await Promise.all(
    langs.map(async (lang) => {
      top[lang] = await db
        .select({
          player_name: scores.player_name,
          score:       scores.score,
          phrase_id:   scores.phrase_id,
          phrase_text: phrases.text,
        })
        .from(scores)
        .innerJoin(phrases, eq(scores.phrase_id, phrases.id))
        .where(eq(phrases.language, lang))
        .orderBy(desc(scores.score))
        .limit(10)
    })
  )

  return c.json(top)
})

export default app
