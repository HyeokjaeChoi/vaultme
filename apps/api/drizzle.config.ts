import { defineConfig } from 'drizzle-kit'

// Offline only: `generate` and `check` read no database (no d1-http credentials, no Cloudflare token).
// `out` is the folder wrangler applies (`migrations_dir` in wrangler.jsonc); drizzle-kit adds `meta/` beside the SQL.
// DRIZZLE_OUT is set only by scripts/db-check.ts, so the drift check generates into a copy and leaves `migrations/` alone.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: process.env.DRIZZLE_OUT ?? './migrations',
})
