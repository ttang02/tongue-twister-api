import { Elysia, t } from 'elysia'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { scores, phrases } from '../db/schema'

const langEnum = t.Union([t.Literal('fr'), t.Literal('en'), t.Literal('ko'), t.Literal('vi')])
const diffEnum = t.Union([t.Literal('easy'), t.Literal('medium'), t.Literal('hard')])

const LANGS = ['fr', 'en', 'ko', 'vi'] as const

export const scoresRoute = new Elysia({ prefix: '/scores' })

  .get('/', async ({ query }) => {
    const { lang, difficulty, phrase_id, limit } = query

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
          lang       ? eq(phrases.language,   lang)      : undefined,
          difficulty ? eq(phrases.difficulty, difficulty) : undefined,
          phrase_id  ? eq(scores.phrase_id,   phrase_id) : undefined,
        )
      )
      .orderBy(desc(scores.score))
      .limit(limit ?? 50)

    return { data: rows, total: rows.length }
  }, {
    query: t.Object({
      lang:       t.Optional(langEnum),
      difficulty: t.Optional(diffEnum),
      phrase_id:  t.Optional(t.Numeric({ minimum: 1 })),
      limit:      t.Optional(t.Numeric({ minimum: 1, maximum: 200, default: 50 })),
    }),
  })

  .post('/', async ({ body, set, error }) => {
    const phrase = await db.select().from(phrases).where(eq(phrases.id, body.phrase_id)).get()
    if (!phrase) return error(404, { error: 'Phrase not found' })

    // Recalculate score server-side to prevent cheating
    const remaining_s  = Math.max(0, phrase.timer_s - body.elapsed_ms / 1000)
    const serverScore  = Math.round(body.accuracy * 1000) + Math.floor(remaining_s) * 10
    const sanitized    = body.player_name.replace(/[<>&"]/g, '').slice(0, 30)

    const result = await db.insert(scores).values({
      phrase_id:   body.phrase_id,
      player_name: sanitized,
      elapsed_ms:  body.elapsed_ms,
      accuracy:    body.accuracy,
      score:       serverScore,
    }).returning({ id: scores.id })

    const rank = await db
      .select({ count: sql<number>`count(*)` })
      .from(scores)
      .innerJoin(phrases, eq(scores.phrase_id, phrases.id))
      .where(and(
        eq(phrases.language, phrase.language),
        sql`${scores.score} > ${serverScore}`,
      ))
      .get()

    set.status = 201
    return { id: result[0]!.id, score: serverScore, rank: (rank?.count ?? 0) + 1 }
  }, {
    body: t.Object({
      phrase_id:   t.Integer({ minimum: 1 }),
      player_name: t.String({ minLength: 1, maxLength: 30 }),
      elapsed_ms:  t.Integer({ minimum: 0 }),
      accuracy:    t.Number({ minimum: 0, maximum: 1 }),
    }),
  })

  .get('/top', async () => {
    const top: Record<string, unknown[]> = {}

    await Promise.all(
      LANGS.map(async (lang) => {
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

    return top
  })
