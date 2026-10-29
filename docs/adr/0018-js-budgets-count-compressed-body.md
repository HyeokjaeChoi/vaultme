# 0018. The JS budgets count the compressed JS body

Status: Accepted (2026-10-29, issue #272, owner decision "우리도 JS 본문만 세는 식으로 하자"). Supersedes in part [0012](0012-web-scope-and-quality-bars.md) and [0017](0017-web-analytics-beacon-and-js-budgets.md): how the JS budgets are measured (Lighthouse `resource-summary:script:size`, transfer size). The limits and the rest of both ADRs still bind.

## Context
CI measured the JS budgets with Lighthouse `resource-summary:script:size`. That is transfer size: the compressed body plus the response headers of every JS response. `public/_headers` puts the full document header set on every response (CSP with script hashes, Permissions-Policy, COOP and more), about 1.1 to 1.5 KB per JS file. A page with ~10 JS files pays ~10 to 15 KB for a server setting, not for code. Renovate PR #228 (react-router 8.5.0, +3.25 KB gzip) failed `lhci` at 155,871 B for this reason.

Published budgets are stated in compressed bytes, not in bytes with headers. web.dev "Performance Budgets 101" sets a critical-path budget of 170 KB compressed; Alex Russell's "The Performance Inequality Gap, 2024" (https://infrequently.org/2024/01/performance-inequality-gap-2024/) states its JS budget in compressed bytes.

Lighthouse 12.6 (Lighthouse CI 0.15.1) has no built-in option for this: `resource-summary` and `budgets.json` use `transferSize` (headers included), and the `network-requests` audit gives `transferSize` and `resourceSize` (uncompressed).

## Decision
- A JS budget is the sum of the gzip body bytes of all same-origin JS a page loads, lazy chunks included, response headers excluded. Inline scripts and third-party scripts (the Web Analytics beacon, ADR-0017) are not counted.
- The limits do not change: static pages (landing, 404) ≤ 102,400 B, viewer (`/address`, `/tx`, ko and en) ≤ 153,600 B.
- `apps/web/scripts/js-budget.ts` runs after `lhci autorun` in `lhci:desktop` and `lhci:mobile`. For each URL it reads the saved reports (`.lighthouseci/lhr-*.json`), takes the Script requests of the `network-requests` audit, maps each URL to its file in `build/client`, compresses it with gzip level 9 and sums. With several runs of a URL, the largest counts. It prints one row per URL and fails when a page is over its limit.
- The `resource-summary:script:size` assertions are removed from `lighthouserc.*.json`. Scores, Core Web Vitals and axe stay as they were.
- `_headers` stays as it is.

## Consequences
- Headers can grow (a longer CSP, a new security header) without touching the JS budget.
- The measured size is the size of the built file compressed with Node gzip level 9, not of a response. Measured on `wrangler dev` (2026-10-29): the Static Assets runtime answers gzip about 45 B per file larger than that (`router` chunk 44,015 B vs 43,969 B) and brotli about 4 to 5% smaller (42,062 B). Browsers that accept brotli get fewer bytes than the budget counts.
- A page whose JS is not loaded by the Lighthouse run (for example `/tx` with a hash, loaded lazily after a data read) is not measured; this was already so for transfer size.
