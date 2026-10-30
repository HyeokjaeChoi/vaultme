# @vaultme/perf

Performance measurements ([ADR-0019](../../docs/adr/0019-performance-measurements-and-baseline.md)). Numbers: [docs/perf/baseline.md](../../docs/perf/baseline.md).

## API benchmark (k6)

`k6/api.js` measures the staging API with [Grafana k6](https://grafana.com/docs/k6/latest/) (pinned to 2.3.0 in CI).
It registers one temporary install and gets a token, as the app does (a key made in memory, nothing stored), then runs the cases below strictly one after the other (one VU, one scenario, so a slow response cannot overlap the next case):

| Case (`endpoint` tag) | What it calls                                                                     | Calls timed |
| --------------------- | --------------------------------------------------------------------------------- | ----------- |
| `health`              | `GET /v1/health`                                                                  | 30          |
| `rpc`                 | `POST /v1/rpc`, `eth_blockNumber`                                                 | 30          |
| `history_hit`         | `POST /v1/history` for the public test address, answered by the 30 s Worker cache | 15          |
| `history_miss`        | the same call 31 s after the last one, so it reaches Etherscan                    | 5           |

Each case has 1 untimed warm-up request first. A run has one mode:

- `MODE=warm`: connections are reused (HTTP keep-alive).
- `MODE=cold`: `noConnectionReuse`, a new TCP and TLS connection for every request. k6 sets this for a whole run, so the two modes are two runs.

Output per case: p50, p90, p95, p99, max of the total time (DNS + TCP + TLS + request + response), error rate, and the parts: DNS, TCP connect, TLS handshake and TTFB (`http_req_waiting`).
Only HTTP 200 responses are timed; any other response counts as an error. k6 `http_req_duration` leaves out DNS, TCP and TLS, so the script records its own `ok_total`.
`handleSummary` writes `k6-api-<mode>.json` and `k6-api-<mode>.md` to `OUT_DIR`.

### Run it locally

```sh
brew install k6          # or see https://grafana.com/docs/k6/latest/set-up/install-k6/
export BASE_URL=https://vaultme-api-staging.gurwo1007.workers.dev   # no trailing slash
mkdir -p k6-out
for mode in warm cold; do k6 run -q -e MODE=$mode -e OUT_DIR=k6-out packages/perf/k6/api.js; done
```

One mode takes about 5 minutes (the history cases wait 31 s between calls). Local numbers include your own network path and are not comparable with the CI runner.
Do not point it at production or a Worker with real users: it spends Etherscan budget (about 18 calls per mode).

### Limits it respects

The reasons for the counts are in the amendment of ADR-0019.

- Per install: at most 1 token + 31 rpc + 21 history = 53 calls per run, under 60 per 60 s. Each run registers one install (limit 3 per 60 s per IP); the two modes of a CI run are minutes apart.
- Etherscan: 6 history calls that reach it per mode, 3 Etherscan calls each.
- Cache: `history_hit` requests follow a miss within a few seconds, so they fall inside the 30 s cache. A cold-mode hit can still land on another Cloudflare server without the cached page and show up as a slow outlier; the max column shows it.

### CI

`.github/workflows/api-bench.yml` runs both modes weekly and on `workflow_dispatch`, writes the job summary and uploads the artifact `api-bench` (90 days).
It uses the variable `STAGING_API_URL` of the `staging` environment and no secret. Results are not uploaded anywhere else (no k6 Cloud).
Start it by hand: `gh workflow run api-bench.yml`.

The older `latency` command (`pnpm --filter @vaultme/perf latency`) stays as the Node measurement behind the baseline until the baseline moves to k6.
