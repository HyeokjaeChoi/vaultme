# Performance baseline

Measured 2026-10-30 on commit `f559bff` (local macOS run, not a CI runner). Source of truth for the numbers: `baseline.json` (this file is generated from it).
Storage and procedure: [ADR-0019](../adr/0019-performance-measurements-and-baseline.md). These are measurements, not limits; the SLOs are in [slo.md](slo.md) and the limits stay in `apps/web/lighthouserc.*.json`, `apps/web/scripts/js-budget.ts` and `apps/mobile/package.json`.

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
| ios | 8123911 | 7.75 | 11.00 |
| android | 8117373 | 7.74 | 11.00 |

## API latency (staging)

Timed from one machine, so it includes the network path to Cloudflare. Calls: 20 health, 20 rpc, 5 history, in that order, one at a time.
History reads the public test address `0x9858EfFD232B4033E47d90003D41EC34EcaEda94`, 31 s apart, so each call is newer than the 30 s page cache.

| Endpoint | Calls ok / sent | p50 (ms) | p95 (ms) |
| --- | --- | --- | --- |
| `GET /v1/health` | 20 / 20 | 70 | 109 |
| `POST /v1/rpc` (`eth_blockNumber`) | 20 / 20 | 310 | 809 |
| `POST /v1/history` | 5 / 5 | 1791 | 2320 |

## API benchmark (staging, k6, CI runner)

Measured 2026-10-30 on commit `5827dde` (GitHub Actions ubuntu-latest, k6 2.3.0), 5 runs of `api-bench` ([README](../../packages/perf/README.md)). Times in ms, total = DNS + TCP + TLS + request + response (HTTP 200 only).
p50 and p95 are the median over the runs; the range columns are the lowest and highest run value (the spread). TCP, TLS and TTFB are medians of the run p50 (0 TCP and TLS in the warm mode: the connection is reused).
Tier 1 SLO: absolute UX limit on the p95, from web.dev and Nielsen ([slo.md](slo.md), [ADR-0020](../adr/0020-api-ux-slo-and-regression-watch.md)); it fails the `api-bench` job only. Tier 2 limit: 1.5 times the highest run p95 of the range column, rounded up; it only warns.
The `history_hit` case has no cache marker in the response; a cold-mode hit that reached another Cloudflare server shows up as a slow outlier.

| Endpoint | Mode | ok / sent | p50 | p50 range | p95 | p95 range | TCP p50 | TLS p50 | TTFB p50 | Tier 1 SLO | Tier 2 limit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /v1/health` | warm | 150 / 150 | 25.9 | 14.81-38.65 | 48.6 | 41.97-87.56 | 0 | 0 | 25.6 | none | 132 |
| `POST /v1/rpc` (`eth_blockNumber`) | warm | 150 / 150 | 66.8 | 28.66-81.76 | 140.3 | 67.54-186.41 | 0 | 0 | 66.6 | 200 | 280 |
| `POST /v1/history`, cache hit | warm | 75 / 75 | 32.1 | 19.5-47.14 | 33 | 27.97-72.96 | 0 | 0 | 30.1 | 200 | 110 |
| `POST /v1/history`, cache miss (Etherscan) | warm | 25 / 25 | 1165 | 1110.84-1176.15 | 1284.1 | 1206.06-1694.5 | 0 | 0 | 1164.7 | 1000 | 2542 |
| `GET /v1/health` | cold | 150 / 150 | 90.4 | 51.16-99.31 | 141.6 | 104.97-222.38 | 18.2 | 29.2 | 34.4 | none | 334 |
| `POST /v1/rpc` (`eth_blockNumber`) | cold | 150 / 150 | 136.6 | 112-210.24 | 271 | 183.22-657.76 | 18.2 | 24.1 | 95.1 | 500 | 987 |
| `POST /v1/history`, cache hit | cold | 75 / 75 | 92.4 | 64.56-96.75 | 115.3 | 98.21-440.05 | 18.2 | 24.6 | 42.8 | 500 | 661 |
| `POST /v1/history`, cache miss (Etherscan) | cold | 25 / 25 | 1223.6 | 1159.91-1322.5 | 1351.7 | 1271.38-1856.1 | 18.1 | 26.3 | 1159 | 1000 | 2785 |
