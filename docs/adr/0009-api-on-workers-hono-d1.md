# 0009. The API runs on Cloudflare Workers with Hono and D1

Status: Accepted (2026-10-13 derived from the removed requirements-session doc, see git history)
Supersedes/Aliases: Q38 (platform part)

## Context
Two options were compared: Workers with Hono and D1, or Node.js with PostgreSQL and a long-running worker. Workers have low operations cost but have CPU limits and some vendor lock-in.

## Decision
`apps/api` is a Hono app on Cloudflare Workers. State is in D1, with SQL migrations. One Durable Object holds the global Etherscan call bucket. Rate limits use the Workers rate limiting binding. The plan was to keep the Hono code portable to Node.

## Consequences
- No long-running process. Work must fit in one request or one Cron run.
- Staging and production have their own D1, rate limit IDs, and secrets.
- The Workers rate limit is per location and approximate.
- The code uses D1, a Durable Object, and rate limit bindings. A move to Node is now a rewrite of those parts, not only of the routes.

<!-- verified: apps/api/wrangler.jsonc, apps/api/package.json, apps/api/src/index.ts, apps/api/src/bucket.ts, apps/api/migrations/0001_installs.sql -->
