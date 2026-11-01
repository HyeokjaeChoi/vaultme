import type { BatchItem } from 'drizzle-orm/batch'
import { drizzle } from 'drizzle-orm/d1'

/** Drizzle over the D1 binding. No schema object: queries name the tables from `./schema.ts`, so nothing unused is bundled. */
export const getDb = (d1: D1Database) => drizzle(d1)
export type Db = ReturnType<typeof getDb>

/** One D1 batch (an implicit transaction) from a list. drizzle's `batch()` types its argument as a non-empty tuple; every caller guards the empty case. */
export const runBatch = (db: Db, statements: BatchItem<'sqlite'>[]): Promise<D1Result[]> =>
  db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
export type { BatchItem }
