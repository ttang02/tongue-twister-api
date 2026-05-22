import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const phrases = sqliteTable('phrases', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  language:   text('language', { enum: ['fr', 'en', 'ko', 'vi'] }).notNull(),
  country:    text('country',  { enum: ['FR', 'US', 'KR', 'VN'] }).notNull(),
  text:       text('text').notNull(),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull().default('medium'),
  timer_s:    integer('timer_s').notNull().default(20),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const scores = sqliteTable('scores', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  phrase_id:   integer('phrase_id').notNull().references(() => phrases.id),
  player_name: text('player_name').notNull(),
  elapsed_ms:  integer('elapsed_ms').notNull(),
  accuracy:    real('accuracy').notNull(),
  score:       integer('score').notNull(),
  created_at:  text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const playerStats = sqliteTable('player_stats', {
  player_name:  text('player_name').notNull(),
  language:     text('language', { enum: ['fr', 'en', 'ko', 'vi'] }).notNull(),
  total_score:  integer('total_score').notNull().default(0),
  count_easy:   integer('count_easy').notNull().default(0),
  count_medium: integer('count_medium').notNull().default(0),
  count_hard:   integer('count_hard').notNull().default(0),
  updated_at:   text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  pk: primaryKey({ columns: [t.player_name, t.language] }),
}))

export type Phrase      = typeof phrases.$inferSelect
export type NewPhrase   = typeof phrases.$inferInsert
export type Score       = typeof scores.$inferSelect
export type NewScore    = typeof scores.$inferInsert
export type PlayerStats = typeof playerStats.$inferSelect
