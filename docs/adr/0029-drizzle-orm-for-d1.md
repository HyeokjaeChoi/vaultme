# 0029. The API reads and writes D1 through Drizzle, and migrations are generated

Status: Accepted (2026-11-02 from issue #355, owner decision of 2026-11-02)
Supersedes/Aliases: ADR-0009 in part (D1 access was hand-written SQL strings and hand-written migrations); completes Q66

## Context
Every D1 query in `apps/api/src` was a SQL string with a hand-written row cast (`.first<{ address: string }>()`). A column rename compiles and fails at run time. The tables were described only by the migrations. Q66 asked for Drizzle and drizzle-kit; #319 left it open.

## Decision
- `apps/api/src/db/schema.ts` is the schema. Every query uses Drizzle (`drizzle-orm/d1`, `getDb(env.DB)`), so rows are typed from the schema and a wrong column fails at `tsc`.
- Migrations stay plain SQL files in `apps/api/migrations`, the folder wrangler applies (`migrations_dir`). `pnpm --filter @vaultme/api db:generate` (drizzle-kit `generate`, offline: no d1-http driver, no Cloudflare token) writes the next `NNNN_*.sql` there from a schema change. wrangler applies it as before (`wrangler d1 migrations apply`, in `api-staging.yml` and by hand). drizzle-kit never touches a database.
- Baseline: 0001-0004 stay as written. `migrations/meta/` holds a journal and one snapshot (`0004_snapshot.json`) of `schema.ts`, so `generate` on the unchanged schema writes nothing and the next file is `0005_*`. The journal ids start at 1 so they match the file numbers.
- Drift check: `pnpm --filter @vaultme/api db:check` (CI job `verify`) runs `drizzle-kit check`, then `generate` into a temp copy of `migrations/`. A new file there means the schema changed without a committed migration: it fails.
- R16 (`scripts/check-migrations.sh`) still lints every generated `.sql` for `DROP COLUMN`, `DROP TABLE` and `RENAME`. A generated migration that drops needs `-- contract-ok: <reason>` like a hand-written one.
- Statements that stay atomic keep `db.batch` (one D1 batch). No `db.transaction`: D1 has none (drizzle's d1 driver would send `begin`).

## Consequences
- Drizzle adds about 183 KiB (34 KiB gzip) to the Worker bundle.
- drizzle-kit 0.31 cannot emit `STRICT` tables. 0001-0004 are STRICT; a table generated from now on is not. If this matters, edit the generated SQL by hand to add `STRICT` (the snapshot stays valid).
- drizzle-orm 0.45.4 and drizzle-kit 0.31.11 are the latest stable. 1.0.0-rc.5 is a release candidate with a new migration-folder layout and was not used. drizzle-kit 0.31 pulls the deprecated `@esbuild-kit/*` packages (merged into tsx); they run only in dev and CI.
- The D1 limit of 100 bound parameters per statement still applies (chunked reads in `handleActivity`, one delete per id in `checkReceipts`).

<!-- verified: apps/api/src/db/schema.ts, apps/api/drizzle.config.ts, apps/api/scripts/db-check.ts, apps/api/migrations/meta/_journal.json, .github/workflows/ci.yml -->
