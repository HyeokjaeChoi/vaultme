# Quality gates plan

Status: proposal for owner review (issue #482, 2026-11-15, repo at `39fac703`). Nothing in this file is a gate yet.
A gate counts only after its unit is merged, it ran, and its result file exists (AGENTS.md judgment rules 3 and 5).

Method: the planning session checked the 7 known gaps against the code. Seven area reviews (Mobile, Web, API, Blockchain,
Security, DevOps/CI, QA, each a top-tier read-only agent) proposed gates. The planning session merged them, set priority,
and checked the numbers marked "checked" below again. Numbers marked "reviewer" come from one review and were not re-run.

## 1. Result first

- 57 gates proposed: 10 P0, 32 P1, 15 P2. 12 draft ADRs (section 7). 20 owner decisions (section 8). Options not
  adopted, each with its reason: section 6.
- Every gate costs $0: the repository is public (GitHub-hosted runners are free) and each upstream call budget stays far
  below its free tier. Added CI time is an estimate of 3,300 to 4,500 ubuntu job-minutes a month, on top of about
  15,300 today (DevOps review, measured from `gh run list`).
- Five findings change the order of work:
  1. The first `v*` tag run will likely fail, and its retry sends real Sepolia funds again (checked).
     `apps/mobile/.maestro/subflows/send-funded.yaml:77-79` waits 240 s for `보냈어요`. That text shows only for Confirmed, and
     ADR-0006 says `safe` lags 7 to 13 minutes on Sepolia. `apps/mobile/.maestro/run.sh` retries every failed flow, funded ones too.
  2. The E2E flake has a different cause than the docs say (reviewer, from 3 failure screenshots). In the restore flows, one word
     is split across two cells after `pressKey: Enter`, so the restore button stays off. A longer wait cannot fix it.
     34.1 % of 85 `e2e` runs (2026-11-02 to 11-07) needed a retry.
  3. A quota error from Infura inside an HTTP 200 goes to the user, and Alchemy is not tried (`apps/api/src/rpc.ts:108-116`,
     by design today). Infura's free tier (3,000,000 credits a day, 80 per read) is the tightest quota: one install at the
     per-install limit can use it up in about 10.4 hours (reviewer, Infura docs read 2026-11-15).
  4. An Unknown send that never reached a node blocks every new send, with no way out in the app (code reading, not reproduced):
     `blocksNewSend` (`apps/mobile/src/features/send/model/runSend.ts:8-9`) blocks on Unknown, and speed up and cancel exist only
     for Pending (`apps/mobile/src/features/send/model/speedUp.ts:21`).
  5. Five numbers in the docs are stale. A portfolio must not copy them (section 2, gap 6).

## 2. The known gaps, checked

| # | Gap | Verdict | Evidence |
|---|---|---|---|
| 1 | Web: Lighthouse lab only, no INP, no RUM, no size-limit | Confirmed | `apps/web/lighthouserc.mobile.json` asserts TBT, no INP; no `web-vitals` in the repo. Cloudflare Web Analytics (staging only, ADR-0017) already collects INP, LCP and CLS (reviewer, Cloudflare docs); reading it needs an owner token. The viewer JS budget has 589 B left: `/address` 153,011 of 153,600 B (checked, CI run 43559270611). With an address in the fragment the viewer loads 183,434 B, which the budget does not count (reviewer, staging). |
| 2 | k6 is a 1-VU latency bench, not load; `history_miss` misses its SLO | Bench part confirmed; SLO part stale | `packages/perf/k6/api.js:36` (`per-vu-iterations`, 1 VU, 1 iteration). It fails only on own time p95 > 50 ms (`:58`) and on a case with zero 200 answers (`:62`, `rate>0`). `history_miss` p95 is now 404.27 ms warm and 612.58 ms cold (checked, run 42620301611, 2026-11-09), under the 1000 ms SLO. The 1284 ms in `docs/perf/slo.md` and `docs/perf/baseline.md` is from 2026-10-30. |
| 3 | RPC failover per request only, no breaker or health check; no history fallback | Confirmed, plus 3 new gaps | `apps/api/src/rpc.ts` (Infura, then Alchemy; 60 ms hedge for reads). ADR-0007 Consequences: no history fallback. New: quota error in a 200 passes through (finding 3); a 503 has no `Retry-After`, only the 429 has it (checked, `apps/api/src/auth.ts:40-45`); the Etherscan bucket allows 216,000 calls a day, but Etherscan blocks at 100,000 a day since 2026-11-03 (reviewer, Etherscan docs). |
| 4 | No queue or dead-letter; no availability SLO; Q26 p95 not read | Confirmed | `apps/api/src/alerts.ts:25-29` checks only the hourly 5xx count. Q26 is GAP (#335): `push_latency` is written, never read (needs the owner's Cloudflare token). |
| 5 | App: no root or jailbreak check; no phrase zeroing; send E2E stops at the amount screen; no production web workflow or store build | Confirmed, one correction | No root check (`ARCHITECTURE.md` Security model). The 64-byte seed and the HD key bytes are never zeroed (reviewer, traced through viem 2.57.7). Correction: `expo-screen-capture` blocks screenshots on iOS 13+ too (reviewer, Expo SDK 58 docs); the real iOS gap is the app-switcher snapshot (`enableAppSwitcherProtectionAsync` is not called). `docs/testing/e2e.md:19` (send stops at amount). No `v*` tag exists, so the funded flows never ran (checked, `git tag -l 'v*'` is empty). Production web and store builds wait for the first public release (ADR-0025). |
| 6 | Doc mismatches | Confirmed, 5 in total | (a) `docs/perf/baseline.md:79` warm `rpc` tier 1 = 200, code `packages/perf/src/slo.ts:16` = 250 (ADR-0035): `baseline.md` is generated and was not regenerated. (b) `ARCHITECTURE.md` "Build, test and release" says the iOS simulator cannot save the phrase; ADR-0016 Consequences and the CI `create.yaml` run show it can. (c) `history_miss` attainment (gap 2). (d) `docs/perf/slo.md:13` viewer JS 141,673 B, now 153,011 B. (e) `docs/perf/slo.md:14` Hermes 7.75 MiB, now 10,236,843 B iOS = 9.76 MiB, 88.7 % of the 11 MiB limit (checked, artifact `perf-hermes` of run 43559270611). Also `docs/testing/e2e.md` "Slow steps" names the wrong flake cause (finding 2). |
| 7 | Long failed-tx amount overlaps the time column | Root cause found; issue #483 | `apps/web/app/shared/ui/HistoryRows.tsx:115-119`: `break-words` does not lower the min-content width of the `inline-block` span (reviewer, minimal Chromium repro). It came with #470 (checked, commit 819641de). The current test checks only `scrollWidth`. The fix stays inside the Figma column (unit U5). |

## 3. How priority was set

- P0: a real risk to funds or to the send path, or a number that is false today, and the fix is small.
- P1: a gate with a number worth citing, $0, and a moderate amount of work.
- P2: low payoff, or blocked on an owner account.
- No gate competes on throughput. The free tiers cap traffic, so the API gates prove correct degradation under quota and
  fault, and the load test runs at 1.5 times our own rate limits, never at the upstream limits.
- Inside a gate, reuse wins over a new tool (`js-budget.ts`, `packages/perf`, the Workers test pool, the anvil harness,
  Analytics Engine, the Sentry alert pattern).

## 4. Gates

Where: PR = every pull request; weekly = scheduled; release = `release` PR or `v*` tag; deploy = after a merge to `main`.
Result files: `docs/results/<gate-id>/` (gate EVID-1). A number is citable only when its file exists.

### Release path and mobile

| ID | P | Gate | Blocks | Threshold | Where | Unit |
|---|---|---|---|---|---|---|
| CHAIN-1 | P0 | Funded flows wait for Confirmed, never retry, check the chain after | false fail, double send, false pass | wait 1,200 s; 0 retries for `funded`; sender nonce delta exactly 2; receiver ETH and USDC deltas exact; fee per tx ≤ `ABS_MAX_FEE_WEI` | release | U1 |
| MOB-1 | P0 | Fix the restore typing race, then re-baseline | flaky release gate | 10 manual runs: retry needed ≤ 1, 0 fails | manual, once | U1 |
| MOB-7 | P0 | First real `v*` tag (owner) | send E2E never proven | funded send and receive pass on iOS and Android in one run | release | owner, after U1 |
| CHAIN-7 | P1 | Chain constants agree | wrong token signed or shown | the 2 USDC address literals equal; on chain `decimals()` = 6, `symbol()` = USDC, `eth_chainId` = `0xaa36a7` | PR, release | U1 |
| MOB-2 | P1 | E2E flake rate | releases on an unreliable gate | last 10 E2E jobs: retry needed > 10 % warns, > 30 % fails the release | release | U1 |
| MOB-4 | P1 | Install size (APK, simulator `.app`, CI proxies) | native bloat | first run = baseline; +10 % warns, +25 % fails (after 2 releases); APK ≤ 150 MB | release | U1 |
| MOB-5 | P1 | Android cold start (`am start -W` TotalTime) | slow start | median of 10 after 1 warm-up; +25 % warns; ≥ 5,000 ms fails | release | U1 |
| MOB-3 | P1 | Hermes growth warning | silent growth at 88.7 % | warn when a bundle grows > 100 KiB against `main`; 11 MiB fail stays | PR | U9, U7 |
| MOB-6 | P1 | Static a11y check of RN controls | unlabeled controls | every `Pressable`/`Touchable*` has a role (or `accessible={false}`), every `TextInput` a label: 0 missing | PR | U6 |
| SEC-7 | P1 | iOS app-switcher blur on the phrase screen | words in the switcher snapshot | unit test: protection on before reveal, off on blur (2 of 2 paths); 1 simulator image | PR | U6 |
| SEC-8 | P1 | Rooted or jailbroken device warning, advisory only | Q43 gap | unit test of `shouldWarn`, 100 % branches; never blocks; one rooted-emulator image | PR | U6 (Figma first) |
| SEC-11 | P1 | Native config check (`expo config --type introspect`) | config-plugin regressions | `allowBackup` false, no cleartext, no arbitrary loads, permissions and entitlements equal the allow-lists | PR | U6 |
| MOB-8 | P2 | Cold deep links show the lock gate first | phrase shown without auth | 0 fails | release | U1 |
| MOB-9 | P2 | Android target SDK and 16 KB page alignment | store refusal later | targetSdk ≥ 36; `zipalign -c -P 16` exit 0 | release | U1 |
| SEC-9 | P2 | Seed and HD-key buffers wiped after use | key bytes left in memory | 9 asserts (seed all 0, master and child keys null after 3 calls) | PR | U4 |
| SEC-12 | P2 | License allow-list for shipped libraries | copyleft in a store build | 0 GPL/AGPL/LGPL/SSPL/unknown | PR | U6 |

Honest ceiling of SEC-9: JS strings (Keychain result, words, the hex key inside viem) cannot be wiped. The claim is
"seed and HD-key buffers are wiped after each use (tested)", never "the phrase is zeroed".

### API (production-grade criteria)

| ID | P | Gate | Blocks | Threshold | Where | Unit |
|---|---|---|---|---|---|---|
| API-1 | P0 | Quota and fault cases of `/v1/rpc`; quota codes fall back | quota error to every user while Alchemy is healthy | new cases: Infura 402, quota code in a 200, hedge-side 429 or error, key echoed by one side, both hang (reads end ≤ 5.1 s, sends ≤ 10.1 s), truncated JSON; never 500; never the key | PR | U2 |
| CHAIN-4 | P1 | No hedge for `eth_getTransactionCount` | a lagging nonce from Alchemy wins | 0 Alchemy calls when Infura answers in 200 ms | PR | U2 |
| FI-1 | P1 | Fault matrix: Infura, Alchemy, Etherscan, Expo, D1 × 5xx, 429, timeout, bad body, slow, network | 500s, leaks, retry storms | 100 % of 32 cells tested, 0 fails; ≤ 2 upstream calls per request | PR | U2 |
| API-2 | P1 | Etherscan daily budget in the existing Durable Object | history down until 00:00 UTC with no signal | warn at 80,000, refuse at 95,000 a day (503 + `Retry-After` to midnight) | PR | U2 |
| API-3 | P1 | `Retry-After` on every retryable 503 and 429 | retry storms | contract test: header present, integer 1 to 86,400, on every route | PR | U3 |
| SEC-10 | P1 | Abuse cases; 64 KB body limit | replay, forgery, big bodies | each case: documented status, 0 upstream calls, 0 D1 writes except the nonce row; > 64 KB → 413 | PR | U3 |
| API-8 | P1 | Property fuzz of the RPC allow-list (fast-check 4.10.2, already in the repo) | allow-list holes | 0 counterexamples in 500 runs per property | PR | U3 |
| API-4 | P1 | One Analytics Engine point per RPC request and per history miss | quota and hedge cost not visible | warn: hedge rate > 60 % over 7 days; Alchemy CU projection > 50 % of the month; Infura > 2,400,000 credits a day | PR (code), weekly (read) | U2 |
| API-5 | P1 | Alerts with a source: stuck `push_unregister` rows, first Infura 402 of a day | silent dead letters, silent quota loss | ≥ 1 row older than 86,400 s; first 402 per isolate per day | hourly cron | U2 |
| LOAD-1 | P1 | Quota-safe load test on staging (k6 `constant-arrival-rate`) | limiter missing, 429 without `Retry-After`, 5xx under concurrency | 0 non-503 5xx (abort); every 429 has `Retry-After: 60` and `rate_limited`; each probe gets a 429; own time p95 ≤ 50 ms; 0 dropped iterations | weekly, manual | U9 |
| API-6 | P1 | Availability SLO: good = status < 500, per route | an unknown error budget | 99.5 % over 28 days (judged only with ≥ 1,000 requests); a breach opens an issue, never blocks | weekly | U9 (owner token) |
| CHAIN-8 | P1 | Resend through the proxy is idempotent (anvil) | duplicate broadcast after a timeout | 0 fails | PR | U4 |
| API-7 | P2 | Sentry uptime monitor on staging `/v1/health`, 5 min | outage seen by nobody | monitor alert email | always | owner (ADR-L) |
| API-10 | P2 | Worker bundle size budget | slow Worker start | measured size + 25 % | PR | U3, U7 |
| CHAIN-9 | P2 | `eth_chainId` = `0xaa36a7` in the staging smoke | wrong network | exact | deploy | U9 |

Load-test budget per run (worst case, every read hedged): Infura 450 calls = 36,000 credits (1.2 % of a day; peak 32 % of
500 credits/s), Alchemy 4,500 CU (0.015 % of 30,000,000 a month), Etherscan 0, Workers 1,386 requests, 3 installs.
A month (6.35 runs): Infura 0.25 %, Alchemy 0.095 %. The IP probes send no token, so they reach no upstream.

### Chain correctness

| ID | P | Gate | Blocks | Threshold | Where | Unit |
|---|---|---|---|---|---|---|
| CHAIN-3 | P0 | Send lifecycle on anvil (`--chain-id 11155111`) with the real app code | state, nonce and reorg bugs hidden by fakes | 9 cases (Confirmed, Failed, reorg back to Pending, speed up, cancel, Replaced, duplicate broadcast, stale nonce, Unknown deadlock as `it.fails`): 0 fails, suite ≤ 60 s | PR | U4 |
| CHAIN-5 | P1 | Property tests: fee cap, `prepare`, replacement math, `deriveState`, `toUnits` | money-math edge cases | 0 counterexamples, 1,000 runs per property | PR | U4 |
| MUT-1 | P1 | Mutation score (Stryker 10.1.1) on `wallet-core` and `history` | tests that run code but assert nothing | `break` = first measured score floored to 5, never below 60; target 80; the floor only goes up | PR (when those packages change) | U4 |
| CHAIN-10 | P2 | One reverting tx gives a `failed` push (Q23) | Q23 "not verified" | 1 push within 5 min | manual, once (owner) | owner |

### Web

| ID | P | Gate | Blocks | Threshold | Where | Unit |
|---|---|---|---|---|---|---|
| WEB-1 | P0 | Amount box stays in its cell (issue #483) | overlap bugs | 0 px overlap (0.5 px tolerance) at 375, 768, 1280 px | PR | U5 |
| WEB-2 | P0 | Viewer JS measured with data loaded | a resume number that is not the real page | 153,600 B (ADR-C); warning until about 30 KB is cut; headroom warning under 2 % | PR | U5 |
| WEB-3 | P1 | Lab INP, LCP, CLS with data (Playwright, CPU 4×, Lighthouse mobile network, fixture API at the API SLO limits) | slow clicks; TBT says little | median of 3: INP ≤ 200 ms, LCP ≤ 2,500 ms, CLS ≤ 0.1 | PR | U5 |
| WEB-4 | P1 | 0 CSP violations on every page and state | silently blocked scripts | 0 `securitypolicyviolation` events | PR | U5 |
| WEB-6 | P1 | A production build cannot use the staging API | production reads staging | `finalize()` throws when `WEB_ENV=production` and the API origin is unset or staging | PR | U5 |
| WEB-5 | P1 | Viewer smoke with real staging data after deploy | CORS, CSP or token drift | balances and history (or empty state) in ≤ 10 s; tx page; 0 CSP violations; 0 page errors | deploy | U8 |
| WEB-7 | P2 | bfcache stays eligible | slow back navigation | Lighthouse `bf-cache` = 1 | PR | U5 |
| WEB-8 | P2 | Keyboard-only viewer flow | focus and Enter bugs | 0 fails; visible focus ring | PR | U5 |
| WEB-9 | P2 | Internal links answer 200 | broken links in pages | 0 broken | PR | U5 |

### Security, CI and evidence

| ID | P | Gate | Blocks | Threshold | Where | Unit |
|---|---|---|---|---|---|---|
| SEC-1 | P0 | Vulnerability exceptions with an expiry date (#481) | an always-red scan that hides a real High | shipped code: 0 known vulns with CVSS ≥ 7.0 without an exception (≤ 14 days, only when no fix); dev and CI tools: 0 without an exception (reason + expiry ≤ 30 days) | PR, weekly, release | U10 |
| EVID-1 | P0 | Results are committed as evidence files | numbers that expire with 90-day artifacts | `docs/results` README equals the render of the files; every file passes the schema | PR | U9 |
| DOC-1 | P0 | Fix the 5 stale numbers (gap 6) | wrong portfolio numbers | regenerated `baseline.*` (5 fresh `api-bench` runs, 180 Etherscan calls once); `slo.md` rows; the `ARCHITECTURE.md` simulator line | once | U9 |
| SEC-2 | P1 | CodeQL `javascript-typescript` + `actions`, `security-extended` | dataflow bugs, workflow injection | 0 new alerts with security severity ≥ 7.0 | PR, main, weekly | U7 |
| WF-1 | P1 | actionlint (0 findings today) | workflow bugs | 0 errors | PR (inside `repo-rules`) | U7 |
| DEP-1 | P1 | Staging rolls back when the smoke fails | a broken staging Worker stays live | rollback and re-check pass; rollback ≤ 2 min (one drill) | deploy | U8 |
| OBS-1 | P1 | Weekly CI health report | rot nobody sees | warn: main red rate > 2 % (today 5 %); PR CI p50 > 12.5 min (today 8.3); `flaky` issue > 14 days; last green `api-bench` > 8 days; a schedule not `active`; Renovate PR > 14 days; cache > 9 GB. DORA numbers report only | weekly | U9 |
| FLAKY-1 | P1 | One rolling flaky issue per flow, labeled `flaky` | duplicate issues (#388, #389) | comment, never a new issue, when one is open | release | U1 |
| FLK-2 | P1 | Fix the 3 known flaky unit tests (#344, signer-import timeout, bucket timing) | red `main` from flakes | 0 fails in a weekly `--repeats 10 --sequence.shuffle` run | PR, weekly | U11, U2 |
| SEC-3 | P2 | zizmor 1.32.0 workflow audit | cache poisoning, excess permissions | 0 findings at medium | PR | U7 (last) |
| SEC-4 | P2 | OpenSSF Scorecard | permission and pinning drift | `Dangerous-Workflow` 10, `Token-Permissions` 10, `Pinned-Dependencies` ≥ 9; aggregate ratchet | weekly | U7 |
| SEC-6 | P2 | Release: merged APK manifest check, SBOM (`pnpm sbom`), build attestation | manifest regressions, unknown build origin | manifest values and permission allow-list exact; `gh attestation verify` exit 0 | release | U1, U8 |
| PROD-1 | P2 | `wrangler deploy --env production --dry-run` for api and web | drift in the unused production blocks | exit 0 | PR | U7 |

## 5. What makes the API production grade here

The owner's premise: the free RPC tier caps traffic, so the API proves correctness and graceful degradation, not throughput.

| Area | Item | Verdict | How |
|---|---|---|---|
| Quota protection | Per-upstream budget | Etherscan: adopt. Infura, Alchemy: measure, do not enforce | API-2; API-4 (a global counter needs a Durable Object call per request) |
| | Cache and request coalescing | Reject now | Isolates share no memory; the Cache API is per data center; near-0 hit rate at this traffic. Revisit when API-4 shows Infura > 1,500,000 credits a day on 2 of 28 days |
| | Client rate limit | Keep, and prove on the real binding | LOAD-1 (all tests mock the limiter today) |
| | Free-tier exhaustion | Improve | API-1 (quota codes fall back), API-3 (`Retry-After`), API-5 (alert) |
| Fault handling | Circuit breaker | Reject | A Durable Object call took 20 to 223 ms in two bench runs: 0.4 to 4.5 times the 50 ms own-time budget (ADR-0036). Durable Objects Free has 100,000 requests a day, the same as Workers Free |
| | Health check, latency routing | Reject | Hourly cron is too slow to route on and each probe spends quota; the 60 ms hedge is latency routing per request |
| | Fault injection | Adopt | API-1, FI-1 |
| Chain correctness | Reorg, nonce gap, duplicate broadcast, idempotency | Adopt | CHAIN-3 cases 3, 6 to 8; CHAIN-4; CHAIN-8 |
| | Response validation | Partly exists; add the deploy check | Signed chain ID and the local hash = node hash check exist (`packages/wallet-core/test/send.test.ts`). CHAIN-9 at deploy. A per-request chain ID or cross-upstream block check: reject (a second upstream call per read) |
| Observability | Per-upstream error rate, latency, quota, hedge rate; error budget | Adopt | API-4, API-5, API-6 |
| Low-capacity load | Degrade near quota, 429, no retry storm | Adopt | LOAD-1 (429 contract on the real limiter), FI-1 (≤ 2 upstream calls per request). Clients never auto-retry today (`retry: false`) |
| Queues | Cloudflare Queues + DLQ | Reject | Queues are on Workers Free (10,000 operations a day), but Alchemy Notify already retries our non-200 answers and `push_sent` dedupes. API-5 gives the dead-letter alert a real source: stuck `push_unregister` rows |
| History fallback | Second history provider | Reject (ADR-0007 stays) | Different semantics (no failed status, other internal transfers), a second merge path, and it spends the same Alchemy month |

## 6. Not adopted

| Option | Reason |
|---|---|
| `web-vitals` in the app (RUM) | Adds 2,204 to 5,358 B gzip against 589 B headroom; conflicts with ADR-0012 (Web Analytics only) and ADR-0024 |
| RUM gate on Cloudflare Web Analytics | It collects INP already, but near-zero traffic makes p75 meaningless; needs an owner token |
| size-limit | `js-budget.ts` already measures what a page loads; size-limit cannot see JS loaded after a fetch either |
| Lighthouse user flows; lhci against the staging API | lhci has no user-flow mode; 40 real page loads per PR, Etherscan 503s, staging token on PRs |
| Visual snapshot tests; CSP report endpoint | The PR rule already needs app-vs-Figma images; box assertions catch overlap; CI catches CSP violations for free |
| Circuit breaker, health check, latency routing, RPC cache, in-flight dedupe, Queues, backup history provider | Section 5 |
| Per-install daily cap | Abuse costs availability of a test-fund service, not money; API-1 and API-5 cover the effect (owner can override) |
| k6 against `wrangler dev`; `ramping-arrival-rate` | The local limiter is a simulation; a ramp measures Infura's limit and burns quota |
| Stryker on `apps/api` | The Workers test pool is not supported by the Stryker Vitest runner |
| anvil `--fork-url` Sepolia; Geth `--dev` | Needs an RPC key and quota; the 10 % replacement rule is covered by unit tests |
| Nightly E2E or nightly chain job | ADR-0033; the anvil suites run per PR in seconds |
| freeRASP | Its free plan sends threat data to Talsec (a new data recipient); its newest versions fail the 7-day rule |
| Play Integrity, App Attest | Owner accounts, keys and a server verifier; ADR-0008 puts attestation out of scope |
| Certificate pinning | Cloudflare rotates certificates; a pin can brick every install; the app already distrusts server values (ADR-0005) |
| gitleaks, trufflehog, Semgrep, MobSF | GitHub secret scanning and push protection are on; R1, R3, R8, R10 cover wallet secrets; CodeQL covers dataflow; MobSF is slow and generic for an RN app |
| Root or jailbreak blocking | Detection is bypassable; blocking locks a user out of their own funds on a false positive |
| Crash-free sessions gate | No real users; Sentry sessions are already on by default |
| `eslint-plugin-react-native-a11y` | Last release 2024-11-04; supports ESLint 8 or older only |
| FlashList, Hermes profiler, iOS cold start, EAS Update | No long list; noisy; needs app code; ADR-0025 |
| Blocking PR wall-clock budget; turbo remote cache | Runner noise (lhci mobile 7.9 to 8.7 min); saves under 2 min and needs a Vercel token. OBS-1 reports the time |
| Gradual deploy on staging; production workflow or EAS production profile now | ADR-0025 |
| Schedule keepalive commits | History noise; OBS-1 detects a disabled schedule |

## 7. Draft ADRs

Letters are placeholders. When the owner accepts a draft, it gets the next free number (from ADR-0040, in acceptance order)
in the approval commit of this file, so parallel units cannot pick the same number. No accepted ADR body is edited; a
superseded one only gets a "Superseded in part by" line.

- **ADR-A. Funded release flows wait for Confirmed, never retry, and are checked on chain.** Context: the 240 s wait is
  shorter than the 7 to 13 min `safe` lag (ADR-0006); a retry broadcasts again. Decision: wait up to 20 min; 0 retries for
  `funded`; `scripts/release-verify` checks nonce delta 2, exact receiver deltas and fee ≤ cap; each tag run writes an evidence
  file with the Etherscan links of the public release wallets' 4 transactions. Supersedes ADR-0033 in part (evidence) and the
  #376 retry rule for `funded` flows. Consequences: a tag run takes about 15 min longer per platform; a failure is re-tagged.
- **ADR-B. Cancel is offered for an Unknown send.** Context: an Unknown send that never reached a node blocks every new send.
  Decision: S23 and S41 offer Cancel (same nonce, 0 ETH to self) for Unknown too. Supersedes ADR-0031 in part (D3). Figma first.
- **ADR-C. The viewer JS budget counts the page with data.** Supersedes ADR-0018 in part (the "lazy chunks not measured"
  consequence). Shell stays an error in lhci; with data is measured by Playwright, same gzip method, warning until it fits 153,600 B.
- **ADR-D. Measured results are committed as evidence files.** Adds to ADR-0019. Each gate job uploads `evidence-<gate>.json`
  (fixed schema: gate, metric, value, unit, threshold, pass, commit, run id and URL, workflow, time, samples, window, origin, tool);
  a `packages/perf` command writes them under `docs/results/<gate>/` and regenerates one README in a normal PR; a test fails when they differ.
- **ADR-E. Staging rolls back when the post-deploy smoke fails.** Adds to ADR-0025 (production gradual deploy stays deferred).
  `wrangler rollback` only after a successful deploy; migrations stay (R16 add-only keeps the old code valid).
- **ADR-F. Quota-safe API load test on staging.** Adds to ADR-0019 with its own call budget (section 4). Not a release gate
  (ADR-0036). An upstream outage aborts the run and warns; only our own bugs fail it.
- **ADR-G. API availability SLO: 99.5 % over 28 days.** New. SLI from the existing Analytics Engine `request` points; a breach
  opens an issue, never blocks. Why not 99.9 %: three free tiers with no SLA, and one history provider (ADR-0007).
- **ADR-H. Vulnerability exceptions expire.** Refines Q74. Exceptions live in the osv-scanner config with an id, a reason and
  an expiry; a repo rule rejects one without both; the release tag runs a full scan.
- **ADR-I. The rooted-device warning is advisory.** Q43 part. jail-monkey 3.0.0 on cold start, one dismissible warning, never
  blocks, never sent anywhere. Figma and grilling first.
- **ADR-J. The phrase screen relies on the OS capture block.** Supersedes Q43 in part (screenshot fallback): iOS 13+ and Android
  block screenshots already; add the iOS app-switcher blur; no screenshot listener.
- **ADR-K. The release gate counts flaky retries, install size and Android cold start.** Supersedes ADR-0032 in part ("a pass
  on the retry lets the release continue"): the release fails when more than 30 % of the last 10 E2E jobs needed a retry,
  when the APK grows more than 25 % (after 2 baseline releases), or when the median cold start is 5 s or more.
- **ADR-L (P2). One Sentry uptime monitor for the staging API.** Supersedes ADR-0024 in part (Sentry scope: errors and one
  uptime monitor; still no tracing, replay or profiling).

## 8. Owner decisions (answer one at a time)

Each has a recommended answer. The units that wait on a decision say so in section 9.

1. ADR-A: funded flows wait up to 20 min, never retry, are checked on chain, and commit Etherscan links of the release
   wallets' transactions? Recommended: yes (test wallets, already public on Etherscan; never an app user's hash).
2. After U1's first PR: start 10 manual E2E runs (about 8 h of free runner time), then fund wallet B and cut `v0.1.0`? Recommended: yes.
3. ADR-D: one evidence folder `docs/results/` for every gate? Recommended: yes.
4. ADR-C: keep the 150 KB viewer limit for the page with data, and cut about 30 KB first (warning until then)? Recommended: yes.
5. WEB-3: lab INP over 200 ms fails a PR? Recommended: yes.
6. Is the Cloudflare account on Workers Free or Paid? (Free has a 10 ms CPU limit; it changes API-10 and a CPU check.) And may a
   read-only `Account Analytics: Read` token be added as a repository secret (unblocks Q26 #335 and API-6)? Recommended: yes, read-only.
7. ADR-G: availability SLO 99.5 % over 28 days? Recommended: yes.
8. ADR-E: automatic staging rollback? Recommended: yes.
9. ADR-F: weekly quota-safe load test; a 503 `unavailable` (both upstreams down) does not fail it? Recommended: yes.
10. MUT-1: the mutation floor is a required check from the first PR? Recommended: yes.
11. ADR-H: dated exceptions for the 6 current dev and build tool findings of #481? Recommended: yes.
12. ADR-I: advisory root warning with jail-monkey, after a Figma frame and a grilling session? Recommended: yes.
13. ADR-J: drop the Q43 screenshot fallback and add the iOS switcher blur? Recommended: yes.
14. ADR-B: Cancel for an Unknown send, after Figma and grilling? Recommended: yes.
15. ADR-K: release fails on flake rate > 30 %, APK +25 % (after 2 releases), cold start ≥ 5 s? Recommended: yes, after MOB-1.
16. SEC-2: make CodeQL a required check after 2 weeks of green runs? Recommended: yes.
17. MOB-6: one recorded VoiceOver and TalkBack run before the first tag (marks the Q76 proof)? Recommended: yes.
18. CHAIN-10: send one reverting tx from a release wallet to check Q23 once? Recommended: yes, before the first tag.
19. ADR-L: create one free Sentry uptime monitor on staging `/v1/health`? Recommended: yes, later (P2).
20. Apple Developer ($99 a year) and Play Console ($25 once)? Recommended: not now; only for TestFlight or Play internal testing.

## 9. Work units

Rules:

- Each unit is one session that owns its files. It may ship several PRs in the order listed. Units of the same wave never
  share a file, so they can run in parallel.
- Ledger files are the exception, because repo rules want the row in the implementing PR: the `AGENTS.md` enforced-rules
  table, `docs/decisions.md`, `ARCHITECTURE.md`, `docs/perf/slo.md` and `pnpm-lock.yaml` (generated). A unit edits only its own
  rows there and rebases before it merges.
- Three files are shared across waves, never inside one: `.github/workflows/ci.yml` (U4 in wave 1, then U7), `apps/mobile/package.json`
  (U4, then U6), `knip.jsonc` (U4, then U8 if its new config needs an entry). U6 also turns U4's `it.fails` Unknown case into a pass,
  and U7's last PR (zizmor) may fix a workflow file of U1 or U8 after that unit has merged.
- Implementation runs on the mid tier (`docs/agents/models.md`); U0 (grilling) runs on the top tier.
- Every unit follows `docs/agents/workflow.md`, reads `ARCHITECTURE.md`, the ADRs of its area and the lessons skill first, and
  uses ctx7 before it picks a version (judgment rule 4, pnpm `minimumReleaseAge` 7 days).

### Wave 0: owner

- **U0. Decisions, Figma and grilling** (no PR). The owner answers section 8. A top-tier session grills ADR-B and ADR-I and
  builds their Figma frames (`vaultme-figma-screen`, audit = 0). The approval commit of this file sets the ADR numbers.

### Wave 1: start after decisions 1 to 5

| Unit | P | Gates, PR order | Proof | Waits for |
|---|---|---|---|---|
| U1 Release path | P0 | (1) MOB-1 + CHAIN-1; (2) CHAIN-7 + FLAKY-1; (3) MOB-2; (4) MOB-4, MOB-5, MOB-9; (5) MOB-8, SEC-6 manifest | (1) 10 manual runs (decision 2), `release-verify` unit test; owner then cuts `v0.1.0` | decisions 1, 2, 15; PR (5) reads the permission allow-list of U6 (2) |
| U2 API upstreams | P0 | (1) API-1 + CHAIN-4; (2) API-2 + bucket test flake; (3) FI-1; (4) API-4; (5) API-5 | each new case red before the change, green after; coverage floors hold | none |
| U3 API edge | P1 | (1) API-3; (2) SEC-10; (3) API-8; (4) API-10 script | contract and abuse tests; `openapi:check` and oasdiff green | decision 6 (API-10) |
| U4 Chain tests | P0 | (1) CHAIN-3 + the `ci.yml` step; (2) CHAIN-5; (3) CHAIN-8; (4) MUT-1; (5) SEC-9 | suite green in `verify`; breaking receipt parsing makes it red; Stryker `break` set | decision 10 |
| U5 Web | P0 | (1) WEB-1 (#483); (2) WEB-6; (3) WEB-2 + WEB-3; (4) WEB-4; (5) WEB-7, WEB-8, WEB-9 | (1) red at 768 and 1280 px, green after, Figma comparison images; (3) a 300 ms busy click handler fails it locally | decisions 4, 5 |
| U9 Perf and evidence | P0 | (1) DOC-1; (2) EVID-1; (3) LOAD-1; (4) OBS-1; (5) MOB-3 command; (6) CHAIN-9; (7) API-6 | (2) a hand-edited README number fails the test; (3) one dispatch run lists every threshold | decisions 3, 6, 7, 9 |
| U10 Supply chain | P0 | (1) SEC-1 + explicit pnpm trust settings | weekly osv dispatch green; an exception without a reason fails `check-repo-rules.sh` | decision 11 |
| U11 Flaky unit tests | P1 | (1) #344; (2) signer-import timeout | 0 fails in `--repeats 10 --sequence.shuffle` | none |

### Wave 2: after the wave 1 units that share a file have merged

| Unit | P | Gates, PR order | Proof | Waits for |
|---|---|---|---|---|
| U6 Mobile app | P1 | (1) SEC-7; (2) MOB-6, SEC-11, SEC-12, 426 wiring test; (3) SEC-8; (4) ADR-B fix (flips the U4 `it.fails`) | unit tests; simulator image; rooted-emulator image | U0 Figma, decisions 12 to 14, U4 merged |
| U7 CI hygiene | P1 | (1) WF-1; (2) SEC-2 CodeQL; (3) PROD-1; (4) MOB-3 and API-10 steps; (5) SEC-4; (6) SEC-3 zizmor, last, after every workflow-owning unit merged | `repo-rules` shows 0 findings; a scratch unpinned `uses:` fails it | U4 (1), U9 (5), decision 16 |
| U8 Staging safety | P1 | (1) DEP-1 + one drill; (2) WEB-5; (3) SEC-6 web attestation | drill run: deploy, forced smoke fail, rollback ≤ 2 min, green re-check | decision 8 |

### File sets

```text
U1  apps/mobile/.maestro/** (subflows, flows, run.sh, new coldstart-android.sh, new deeplink.yaml)
    scripts/release-verify.mts (new) + its test, scripts/release-balance.mts, scripts/e2e-flake-rate.* (new),
    scripts/check-apk-manifest.sh (new), apps/mobile/test/constants.test.ts (new),
    .github/workflows/release.yml, .github/workflows/e2e.yml, docs/testing/e2e.md, ADR-A, ADR-K
U2  apps/api/src/{rpc,bucket,etherscan,metrics,alerts}.ts,
    apps/api/test/{rpc,bucket,history-route,observability}.test.ts, apps/api/test/faults.test.ts (new)
U3  apps/api/src/{errors,auth,app}.ts, docs/openapi/v1.json, packages/api-client/src/**, packages/api-client/test/**,
    apps/api/test/{app,installs}.test.ts, apps/api/test/{abuse,rpc-fuzz}.test.ts (new), apps/api/package.json,
    apps/api/scripts/bundle-budget.ts (new)
U4  apps/mobile/test-anvil/** (new), apps/mobile/anvil-setup.ts (new), apps/mobile/vitest.anvil.config.ts (new),
    apps/mobile/tsconfig.json, apps/mobile/package.json (script), packages/wallet-core/** (tests, src/mnemonic.ts,
    package.json devDependencies, stryker config), packages/history/package.json + stryker config,
    apps/api/test-reorg/send-idempotency.test.ts (new), .github/workflows/mutation.yml (new),
    .github/workflows/ci.yml (one step), .gitignore, knip.jsonc
U5  apps/web/app/shared/ui/HistoryRows.tsx, apps/web/e2e/** (history, fixture-api, new perf, csp, keyboard, links specs),
    apps/web/scripts/{js-budget,finalize}.ts, apps/web/test/{js-budget,finalize}.test.ts, apps/web/lighthouserc.*.json, ADR-C
U6  apps/mobile/src/** (pages/backup, new features/device-integrity, one shell mount, features/send speed-up and cancel,
    widgets/speed-up), packages/i18n/src/**, apps/mobile/test/{backup-capture,device-integrity,native-config,
    a11y-props,update-gate-wiring}.test.ts (new), apps/mobile/test/licenses.test.ts, apps/mobile/eslint.config.mjs,
    apps/mobile/package.json (jail-monkey), apps/mobile/android-permissions.allow (new),
    docs/testing/device-checklist.md, ADR-B, ADR-I, ADR-J
U7  .github/workflows/ci.yml, .github/workflows/{codeql,scorecard}.yml (new), .github/zizmor.yml (new),
    README.md + README.ko.md (badge, R7), and in its last PR any workflow file zizmor flags
U8  .github/workflows/{api-staging,web-staging}.yml, apps/web/e2e-staging/** (new),
    apps/web/playwright.staging.config.ts (new), ADR-E
U9  packages/perf/** (k6/load.js, k6/lib.js, k6/api.js, src/{evidence,load,ci-health,availability,smoke,cli}.ts, tests, README),
    docs/perf/baseline.{json,md}, docs/results/** (new),
    .github/workflows/{api-load,ci-health,api-availability}.yml (new), ADR-D, ADR-F, ADR-G
U10 osv-scanner.toml (new), scripts/check-repo-rules.sh, pnpm-workspace.yaml, ADR-H
U11 apps/api/test/push.test.ts, apps/mobile/test/signer-import.test.ts
```

## 10. Final deliverable (after implementation)

The generated README in `docs/results` (EVID-1) becomes the list the owner copies: per gate the threshold, where it runs, the
last measured value, the commit, the run link and the result file. Until a gate has a file there, it is not listed.

## 11. Could not check

- Whether Infura still answers limits with HTTP 200 + JSON-RPC `-32005`; Alchemy's answer at the monthly cap; Alchemy free
  throughput (two of its docs say 300 and 500 CU/s); the text of Etherscan's daily block.
- The Cloudflare plan (Free or Paid) and real production traffic (production is not deployed; Analytics Engine needs the token).
- CodeQL and Stryker run time; Stryker with Vitest 5 (its runner docs say only `threads: true`); zizmor findings (not run).
- Lab INP numbers (not run); Firefox and Safari for the #483 fix; the modules inside the 28,260 B lazy chunk.
- What jail-monkey returns on the CI emulator; whether the iOS switcher shows the words today.
- Maestro's longest `extendedWaitUntil`, the `focused` selector and `setClipboard` (MOB-1).
- Whether `wrangler rollback` restores the static assets of the web Worker (the DEP-1 drill proves it).
- Android vitals 5 s and Play 16 KB and 150 MB numbers were taken from memory by the reviewer, not re-read.
