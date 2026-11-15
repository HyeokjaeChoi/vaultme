# 0046. API availability SLO: 99.5 % over 28 days

Status: Accepted (2026-11-16, plan `docs/plans/quality-gates.md` ADR-G, owner decision 7 taken at its recommended value). New: [0036](0036-api-release-gate-own-time-slo-window.md) judges time, nothing judges whether the API answers.

## Context
The API writes one Workers Analytics Engine point per request (`recordRequest`, `apps/api/src/metrics.ts`: route, status, duration). Nobody reads them, so the error budget is unknown. The API sits on three free upstream tiers with no SLA and one history provider (ADR-0007).

## Decision
- SLI: per route, the share of responses with a status below 500. A 401, 403 or 429 from a limiter or a guard is the API doing its job and counts as good; a 503 `unavailable` is a 5xx and counts as bad.
- SLO: 99.5 % over 28 days, per route, judged only with at least 1,000 requests in the window. A route with fewer is shown, not judged.
- Why not 99.9 %: three free tiers without SLA and one history provider. 99.5 % is about 3.4 hours of bad answers in 28 days.
- `.github/workflows/api-availability.yml` (weekly): runs `cli.ts availability sql <dataset>` and sends the query to the Cloudflare Analytics Engine SQL API with curl; the read-only token stays in that shell step. `cli.ts availability check` judges the answer and exits 3 on a breach; a breach opens or updates one issue and blocks nothing. The job skips with a notice while the token secret is not set.
- Pure code in `packages/perf/src/availability.ts`, tested.

## Consequences
- Needs a read-only `Account Analytics: Read` token as a repository secret and the account id (owner, #335). Until then the workflow only skips.
- `_sample_interval` is summed, so sampling at high volume does not skew the ratio. Staging traffic is mostly CI, so the number says how the API behaves under test, not for users, until production has traffic.
- A route that is down for hours but has under 1,000 requests is not judged.
