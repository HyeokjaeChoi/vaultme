import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Single source of the D1 schema. `pnpm db:generate` turns a change here into the next `migrations/NNNN_*.sql`;
// `pnpm db:check` (CI) fails when this file and the committed migrations disagree. Migrations 0001-0004 are hand-written
// and are the baseline: they are also STRICT tables, which drizzle-kit 0.31 cannot emit (ADR-0029). Times are unix seconds.

export const installs = sqliteTable('installs', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(), // base64url, uncompressed P-256 point
  createdAt: integer('created_at').notNull(),
  lastSeenAt: integer('last_seen_at').notNull(),
})

export const nonces = sqliteTable(
  'nonces',
  {
    installId: text('install_id')
      .notNull()
      .references(() => installs.id, { onDelete: 'cascade' }),
    nonce: text('nonce').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.installId, t.nonce] })],
)

export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    installId: text('install_id')
      .primaryKey()
      .references(() => installs.id, { onDelete: 'cascade' }),
    address: text('address').notNull(), // lowercase 0x address
    expoToken: text('expo_token').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('push_subscriptions_address').on(t.address)],
)

export const pushUnregister = sqliteTable('push_unregister', {
  address: text('address').primaryKey(),
  createdAt: integer('created_at').notNull(),
})

export const pushSent = sqliteTable(
  'push_sent',
  {
    installId: text('install_id').notNull(),
    ref: text('ref').notNull(), // `<tx hash>:<log index or native>`
    sentAt: integer('sent_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.installId, t.ref] })],
)

export const pushReceipts = sqliteTable(
  'push_receipts',
  {
    receiptId: text('receipt_id').primaryKey(),
    installId: text('install_id').notNull(),
    expoToken: text('expo_token').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('push_receipts_created_at').on(t.createdAt)],
)

export const serverErrors = sqliteTable(
  'server_errors',
  {
    at: integer('at').notNull(),
  },
  (t) => [index('server_errors_at').on(t.at)],
)
