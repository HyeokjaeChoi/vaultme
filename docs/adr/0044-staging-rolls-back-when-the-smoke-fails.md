# 0044. Staging rolls back when the post-deploy smoke fails

Status: Accepted (2026-11-15, issue #547, owner decision 8 of `docs/plans/quality-gates.md`). It adds to [0025](0025-deployment-environments-and-chain-networks.md); it supersedes nothing.

## Context
`api-staging.yml` and `web-staging.yml` run a smoke after the deploy. When it failed, the job went red and the broken Worker kept serving traffic. Staging is the live service of the testnet portfolio (0025).

## Decision
- Both staging workflows read the active Worker version before the deploy (`wrangler deployments list --json`). If the deploy step succeeded and a later smoke step failed, the job runs `wrangler rollback <that version> --env staging`, checks that the active version is that version, runs the smoke again, and stays red. A deploy that failed before the upload never rolls anything back.
- The rollback time is measured from the start of the rollback to the end of a green re-check. The limit is 120 s. It is written as evidence (`DEP-1-api`, `DEP-1-web`, ADR-0043).
- A real rollback opens, or comments on, one issue per Worker (`deploy: staging api rolled back`, `deploy: staging web rolled back`). The drill opens none.
- The drill: `workflow_dispatch` with `rollback_drill: true` deploys the commit, lets the real smoke run, then fails on purpose, rolls back and re-checks. The job is green when the rollback and the re-check pass. One drill per workflow proves the rollback and its time.
- D1 migrations are not rolled back. R16 (add-only) keeps the previous code valid on the new schema.
- Gradual deploy and manual approval stay deferred to production (0025). Staging deploys all at once.

## Consequences
- A bad staging deploy is replaced by the previous version in about a minute, with no person. The job is still red, so the cause is fixed forward on `main`.
- Cloudflare refuses a rollback across a Durable Object class change and to a version with a deleted binding. The step then fails loudly and the Worker stays on the bad version: fix forward.
- The re-check of the web Worker runs the same `apps/web/e2e-staging/smoke.sh` as the smoke, then compares the viewer page (`/address`, which names the hashed assets) with the page read before the deploy. Equal pages mean the old assets are served again. When the drill commit builds the same page as the version before it, the comparison cannot tell the two builds apart.
- The drill ends with staging on the version before the drill. The next push to `main` deploys the current commit again.
- The rollback alert issue opens also when the rollback or the re-check fails: that is when a person is needed.
- Cloudflare keeps the 100 latest versions. A rollback adds one deployment.

<!-- verified: .github/workflows/api-staging.yml, .github/workflows/web-staging.yml, apps/web/e2e-staging/smoke.sh -->
