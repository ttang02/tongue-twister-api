import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema'

const url = process.env.DATABASE_URL ?? 'file:./dev.db'
const file = url.replace('file:', '')

const sqlite = new Database(file, { create: true })
sqlite.run('PRAGMA journal_mode = WAL;')
sqlite.run('PRAGMA foreign_keys = ON;')

export const db = drizzle(sqlite, { schema })
