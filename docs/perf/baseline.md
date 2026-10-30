# Performance baseline

Measured 2026-10-30 on commit `f559bff` (local macOS run, not a CI runner). Source of truth for the numbers: `baseline.json` (this file is generated from it).
Storage and procedure: [ADR-0019](../adr/0019-performance-measurements-and-baseline.md). These are measurements, not limits: the limits stay in `apps/web/lighthouserc.*.json`, `apps/web/scripts/js-budget.ts` and `apps/mobile/package.json`.

## Web: Lighthouse

Median of the runs per page, on the build served by `wrangler dev`. Scores are 0 to 100; BP = best practices.

### Desktop (3 runs per page)

| Page | Perf | A11y | BP | SEO | LCP (ms) | CLS | TBT (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 100 | 100 | 100 | 100 | 292 | 0 | 0 |
| `/address` | 100 | 100 | 100 | 100 | 474 | 0 | 0 |
| `/en/` | 100 | 100 | 100 | 100 | 286 | 0 | 0 |
| `/en/address` | 100 | 100 | 100 | 100 | 471 | 0 | 0 |
| `/en/no-such-page` | 100 | 100 | 96 | 100 | 286 | 0 | 0 |
| `/en/tx` | 100 | 100 | 100 | 100 | 453 | 0 | 0 |
| `/no-such-page` | 100 | 100 | 96 | 100 | 288 | 0 | 0 |
| `/tx` | 100 | 100 | 100 | 100 | 455 | 0 | 0 |

### Mobile (5 runs per page)

| Page | Perf | A11y | BP | SEO | LCP (ms) | CLS | TBT (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 100 | 100 | 100 | 100 | 1210 | 0 | 0 |
| `/address` | 97 | 100 | 100 | 100 | 2113 | 0 | 0 |
| `/en/` | 100 | 100 | 100 | 100 | 1207 | 0 | 0 |
| `/en/address` | 97 | 100 | 100 | 100 | 2116 | 0 | 0 |
| `/en/no-such-page` | 100 | 100 | 96 | 100 | 1056 | 0.001 | 0 |
| `/en/tx` | 97 | 100 | 100 | 100 | 2112 | 0 | 0 |
| `/no-such-page` | 100 | 100 | 96 | 100 | 1058 | 0 | 0 |
| `/tx` | 97 | 100 | 100 | 100 | 2114 | 0 | 0 |

## Web: JS budget (ADR-0018)

Gzip bytes of the app's own JS per page.

| Page | Bytes | Limit | Files |
| --- | --- | --- | --- |
| `/` | 0 | 102400 | 0 |
| `/address` | 141639 | 153600 | 9 |
| `/en/` | 0 | 102400 | 0 |
| `/en/address` | 141639 | 153600 | 9 |
| `/en/no-such-page` | 0 | 102400 | 0 |
| `/en/tx` | 141673 | 153600 | 9 |
| `/no-such-page` | 0 | 102400 | 0 |
| `/tx` | 141673 | 153600 | 9 |

## Mobile: Hermes bundle

| Platform | Bytes | MiB | Limit (MiB) |
| --- | --- | --- | --- |
| ios | 8123911 | 7.75 | 9.00 |
| android | 8117373 | 7.74 | 9.00 |

## API latency (staging)

Timed from one machine, so it includes the network path to Cloudflare. Calls: 20 health, 20 rpc, 5 history, in that order, one at a time.
History reads the public test address `0x9858EfFD232B4033E47d90003D41EC34EcaEda94`, 31 s apart, so each call is newer than the 30 s page cache.

| Endpoint | Calls ok / sent | p50 (ms) | p95 (ms) |
| --- | --- | --- | --- |
| `GET /v1/health` | 20 / 20 | 70 | 109 |
| `POST /v1/rpc` (`eth_blockNumber`) | 20 / 20 | 310 | 809 |
| `POST /v1/history` | 5 / 5 | 1791 | 2320 |

