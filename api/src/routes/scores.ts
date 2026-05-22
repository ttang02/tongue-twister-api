import { Elysia, t } from 'elysia'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { scores, phrases, playerStats } from '../db/schema'

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

  // Aggregated player leaderboard
  .get('/players', async ({ query }) => {
    const { lang, difficulty, limit } = query

    const conditions = [
      lang       ? eq(playerStats.language, lang) : undefined,
      difficulty === 'easy'   ? sql`${playerStats.count_easy} > 0`   : undefined,
      difficulty === 'medium' ? sql`${playerStats.count_medium} > 0` : undefined,
      difficulty === 'hard'   ? sql`${playerStats.count_hard} > 0`   : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined)

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(playerStats)
      .where(where)
      .orderBy(desc(playerStats.total_score))
      .limit(limit ?? 50)

    return { data: rows, total: rows.length }
  }, {
    query: t.Object({
      lang:       t.Optional(langEnum),
      difficulty: t.Optional(diffEnum),
      limit:      t.Optional(t.Numeric({ minimum: 1, maximum: 200, default: 50 })),
    }),
  })

  .post('/', async ({ body, set, error }) => {
    const phrase = await db.select().from(phrases).where(eq(phrases.id, body.phrase_id)).get()
    if (!phrase) return error(404, { error: 'Phrase not found' })

    const sanitized = body.player_name.replace(/[<>&"]/g, '').slice(0, 30)

    // Deduplicate: same player + same phrase → return existing score
    const existing = await db
      .select({ id: scores.id, score: scores.score })
      .from(scores)
      .where(and(eq(scores.player_name, sanitized), eq(scores.phrase_id, body.phrase_id)))
      .get()
    if (existing) {
      const rank = await db
        .select({ count: sql<number>`count(*)` })
        .from(playerStats)
        .where(and(
          eq(playerStats.language, phrase.language),
          sql`${playerStats.total_score} > ${existing.score}`,
        )).get()
      set.status = 200
      return { id: existing.id, score: existing.score, rank: (rank?.count ?? 0) + 1, duplicate: true }
    }

    // Recalculate score server-side to prevent cheating
    const DIFF_MULTIPLIER: Record<string, number> = { easy: 1.0, medium: 1.5, hard: 2.5 }
    const remaining_s = Math.max(0, phrase.timer_s - body.elapsed_ms / 1000)
    const multiplier  = DIFF_MULTIPLIER[phrase.difficulty] ?? 1.0
    const serverScore = Math.round((Math.round(body.accuracy * 1000) + Math.floor(remaining_s) * 10) * multiplier)

    // Insert individual score record
    const result = await db.insert(scores).values({
      phrase_id:   body.phrase_id,
      player_name: sanitized,
      elapsed_ms:  body.elapsed_ms,
      accuracy:    body.accuracy,
      score:       serverScore,
    }).returning({ id: scores.id })

    // Upsert player aggregate — same name+language → accumulate (non-fatal if table missing)
    try {
      await db.insert(playerStats).values({
        player_name:  sanitized,
        language:     phrase.language,
        total_score:  serverScore,
        count_easy:   phrase.difficulty === 'easy'   ? 1 : 0,
        count_medium: phrase.difficulty === 'medium' ? 1 : 0,
        count_hard:   phrase.difficulty === 'hard'   ? 1 : 0,
      }).onConflictDoUpdate({
        target: [playerStats.player_name, playerStats.language],
        set: {
          total_score:  sql`${playerStats.total_score} + ${serverScore}`,
          count_easy:   phrase.difficulty === 'easy'
            ? sql`${playerStats.count_easy} + 1`
            : playerStats.count_easy,
          count_medium: phrase.difficulty === 'medium'
            ? sql`${playerStats.count_medium} + 1`
            : playerStats.count_medium,
          count_hard:   phrase.difficulty === 'hard'
            ? sql`${playerStats.count_hard} + 1`
            : playerStats.count_hard,
          updated_at: sql`CURRENT_TIMESTAMP`,
        },
      })
    } catch (e) {
      console.warn('[player_stats] upsert skipped:', e)
    }

    // Rank: how many scores on same phrase scored higher
    const rank = await db
      .select({ count: sql<number>`count(*)` })
      .from(scores)
      .where(and(
        eq(scores.phrase_id, body.phrase_id),
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
            player_name:  playerStats.player_name,
            total_score:  playerStats.total_score,
            count_easy:   playerStats.count_easy,
            count_medium: playerStats.count_medium,
            count_hard:   playerStats.count_hard,
          })
          .from(playerStats)
          .where(eq(playerStats.language, lang))
          .orderBy(desc(playerStats.total_score))
          .limit(10)
      })
    )

    return top
  })
