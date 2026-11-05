# 0024. Observability: Sentry for errors only, Sentry email instead of Slack, block timestamp as the push clock

Status: Accepted (2026-11-01 from issue #315, owner decisions and instructions of 2026-11-01)
Supersedes/Aliases: Q69 in part (alert channel), Q50 in part (performance monitoring), Q26 in part (start of the clock)

## Context
Q50, Q56, Q69 and Q26 ask for crash and performance monitoring, JSON logs with a request id, SLO alerts to Slack and a push detection p95. The owner decided on 2026-11-01 (issue #315): Sentry for the app and the Worker with PII scrubbing; alerts through Sentry alert rules by email, no Slack webhook; logs and Workers Analytics Engine data points. The owner also asked for no tracing and no replay, to keep the Hermes bundle small.

## Decision
- Sentry collects errors and crashes only. No performance tracing, no replay, no profiling. The performance part of Q50 is dropped.
- Alerts are Sentry events with a fixed fingerprint per condition; a Sentry alert rule emails the owner. Slack (Q69) is not used. The 30-minute dedupe is Sentry's issue grouping. A recovery message is not sent.
- The push latency of Q26 starts at the block timestamp of the event the push is for, and ends when Expo answers the send. It does not start at the finality rule of the approved text.
- Push data points in Analytics Engine are written per group with a count (outcome, or kind and block), because a Worker invocation may write 250 data points at most.
- The Hermes bundle limit of `export:check` goes from 9 MiB to 11 MiB (11534336 B), owner decision of 2026-11-01. No industry limit exists for a Hermes bundle: the React Native docs give none (https://reactnative.dev/docs/Hermes), and the store limit is for the whole app (App Store 200 MB cellular download cap, https://techcrunch.com/?p=1835511). So the budget is the baseline plus headroom, as the 9 MiB was over 7.75 MiB (about 16%). With Sentry the bundle is about 9.65 MiB; 11 MiB keeps about 14%. The 9 MiB came from the baseline work (ADR-0019 only reports it), not from an earlier ADR.
- One scrubber (`packages/contracts/src/scrub.ts`) serves Sentry on both sides and the JSON logs. It is pattern based and best effort (address, hash, key, push token, a run of 12 or more words).

## Consequences
- `@sentry/react-native` adds about 2.1 MB to each Hermes bundle (1.6 MB with the web-only packages left out). This is more than the old 9 MiB limit allowed, hence the new 11 MiB limit above.
- Open parts have issues: p95 reading (#335), watcher-stall and dead-letter conditions (#336), source maps (#337).

<!-- verified: apps/api/src/sentry.ts, apps/api/src/alerts.ts, apps/api/src/metrics.ts, apps/mobile/src/shared/lib/sentry.ts, packages/contracts/src/scrub.ts -->
