# 0010. Push comes from an Alchemy address-activity webhook

Status: Accepted (2026-10-18 from issue #67 owner grilling, commit 93dbdf6)
Supersedes/Aliases: Q38 (watcher, Queues, cursor), Q25 and Q37 (push after `safe`), Q28 (SIWE), Q31 (90-day expiry)

## Context
The design planned our own Cron watcher with a block cursor, an outbox, and Queues. The issue for push records a different choice (owner decision): an Alchemy Notify webhook avoids running our own block scanner, queue and cursor. This gives a lower run cost and fewer moving parts.

## Decision
Reason: lower run cost and fewer moving parts. We do not run our own block scanner, queue or cursor.

Alchemy Notify watches the subscribed Sepolia addresses and calls our webhook. The webhook checks an HMAC signature, then sends one Expo push for each deposit or send of ETH or USDC. Zero-value and other-token transfers are skipped. The text has no amount and no address. A table of sent references stops double pushes on retry. An hourly Cron deletes subscriptions of installs that were inactive for 30 days. A subscription belongs to the install ID (one row per install). The user does not sign to prove the address.

## Consequences
- We depend on Alchemy for detection and for the address list. Failed removals are retried by Cron.
- The push comes when Alchemy reports activity, not after `safe`. A log that Alchemy marks as removed is skipped. A push that was already sent is not taken back.
- Anyone with an install can subscribe any address. They get no data, but they can cause pushes to their own device.
- Detection latency and the 2-minute target are not measured.

<!-- verified: apps/api/src/push.ts, apps/api/src/index.ts, apps/api/src/app.ts, apps/api/migrations/0002_push.sql, apps/api/wrangler.jsonc, packages/contracts/src/push.ts -->
