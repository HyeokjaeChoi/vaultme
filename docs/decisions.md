# Decision ledger

One row per approved requirements decision (Q1–Q81, requirements session 2026-10-13, file outputs/vaultme-requirements-session.md at commit 1623a53, read it with git show).
The HLD, LLD and UX flow of that commit expand these decisions. ADRs in `docs/adr/` record later decisions and changes.

`scripts/check-repo-rules.sh` R14 checks this file: every Q id has one row, the status is valid, a GAP row links an issue, and a SUPERSEDED row names its record.

## Status

- **IMPLEMENTED**: the code does what the decision says.
- **SUPERSEDED**: a later owner decision replaced it, in whole or in part. Record: an ADR, an issue or PR, or a commit; the notes say which part still holds.
- **GAP**: approved, but the code does not do it. The issue asks the owner to implement it or supersede it with an ADR. A gap is never a stale doc claim.
- **NOT-APPROVED**: a proposal that was never approved.

## Rules

- A new approved decision gets a row here in the same PR as its ADR.
- To change a decision, write an ADR and set the row to SUPERSEDED. Do not delete the row.
- A row turns IMPLEMENTED only in the PR that implements it.

## Ledger

| Q | Decision | Status | Record and notes |
|---|---|---|---|
| Q1 | Deliver lo-fi flow, hi-fi prototype, system map | IMPLEMENTED | Figma file (AGENTS.md judgment rule 1), `ARCHITECTURE.md` |
| Q2 | Design stage first; a runnable testnet MVP is optional | IMPLEMENTED | Apps are runnable |
| Q3 | New and restored wallets | IMPLEMENTED | ADR-0002 |
| Q4 | iOS, Android and web | IMPLEMENTED | ADR-0012 |
| Q5 | RN app + small read-only Admin; web = landing/SEO | SUPERSEDED | Admin dropped: ADR-0012, #186 |
| Q6 | One EVM testnet | IMPLEMENTED | Sepolia, `packages/wallet-core/src/constants.ts` |
| Q7 | Native coin + one ERC-20 | IMPLEMENTED | ETH, USDC |
| Q8 | User keeps the phrase; no cloud backup | IMPLEMENTED | ADR-0002 |
| Q9 | One wallet, one account | IMPLEMENTED | ADR-0002 |
| Q10 | OS authentication, no VaultMe PIN | IMPLEMENTED | `shared/auth/authenticate.ts` |
| Q11 | Passkey for Admin login | NOT-APPROVED | Proposal only; Admin dropped (Q5) |
| Q12 | OS auth on every send; cancel signs nothing | IMPLEMENTED | ADR-0004 |
| Q13 | 30 s background grace; relock after kill | IMPLEMENTED | `shell/LockGate.tsx` |
| Q14 | Backup and word check before the receive address | SUPERSEDED | Owner 2026-10-17: receive opens before backup, send needs backup. Commit 7aeb639 (#63); `features/backup/model/gate.ts` |
| Q15 | Re-view phrase from Settings after OS auth; hide on leave | IMPLEMENTED | `pages/backup/index.tsx` |
| Q16 | Restored wallet skips the word check | IMPLEMENTED | `features/backup/model/gate.ts` |
| Q17 | Recipient by typing, paste or QR; no auto send | IMPLEMENTED | `pages/send/scan.tsx` |
| Q18 | Receive: QR, full address, copy, share | IMPLEMENTED | `pages/receive/index.tsx` |
| Q19 | Receive gives the address only; network shown | IMPLEMENTED | `pages/receive/index.tsx` |
| Q20 | App estimates the fee; no speed picker | IMPLEMENTED | `packages/wallet-core/src/send.ts` |
| Q21 | Max amount (native keeps the fee; ERC-20 checks native) | IMPLEMENTED | `packages/wallet-core/src/amount.ts` |
| Q22 | Re-check, last-checked time, explorer link; no auto resend | IMPLEMENTED | ADR-0006 |
| Q23 | Push when an own transaction completes or fails | IMPLEMENTED | #314: `failed` push from the receipt status (`apps/api/src/push.ts` `withFailures`). Not verified: that Alchemy reports every reverted tx |
| Q24 | Push for own results and deposits, by address | IMPLEMENTED | ADR-0010 address webhook; failures added in #314 |
| Q25 | Deposit push once, after `safe` | SUPERSEDED | ADR-0010: push at Alchemy report, before `safe` |
| Q26 | Detection p95 ≤ 2 min, reported only after measuring | GAP | #335: measured since #315 (`push_latency` log line and data point, `recordLatencies` in `apps/api/src/push.ts`), p95 not read yet (needs the owner's Cloudflare token). The clock starts at the block timestamp: ADR-0024 |
| Q27 | Push off by default; explainer; Settings toggle; off deletes the link | SUPERSEDED | #67 decision 5: explainer after first copy or share on Receive |
| Q28 | SIWE ownership proof + device session | SUPERSEDED | ADR-0010: no proof, accepted risk |
| Q29 | Push text names only the event; no tx hash in the payload | SUPERSEDED | ADR-0023, #314 (owner chose B): payload is `kind` only, no opaque id; a tap opens the 내역 list, no per-tx link. Copy fixed in #298 |
| Q30 | App calls the history provider directly | SUPERSEDED | By Q32 in the same session; ADR-0007 |
| Q31 | Idle subscriptions deleted; events 7 d; installs 90 d | IMPLEMENTED | `INSTALL_KEEP_SECONDS` in `apps/api/src/push.ts` `sweep` (#317). Subscription expiry is ADR-0010 (30 d) |
| Q32 | Stateless proxy, no address logs, rate limits, privacy notice | GAP | #311: no privacy notice. Proxy: ADR-0007 |
| Q33 | Expo dev build + EAS Build, no Expo Go | IMPLEMENTED | `apps/mobile/eas.json` |
| Q34 | Keychain `BIOMETRY_ANY_OR_DEVICE_PASSCODE`, this device only | IMPLEMENTED | ADR-0004 |
| Q35 | Sepolia | IMPLEMENTED | `packages/wallet-core/src/constants.ts` |
| Q36 | Etherscan V2 for history; Infura/QuickNode for RPC | SUPERSEDED | RPC fallback is Alchemy, not QuickNode (Q78, ADR-0007). Etherscan history still used; rate: rolling window (#290) |
| Q37 | Confirmed = `safe` for push, send result and UI | SUPERSEDED | Push part: ADR-0010 (push before `safe`). Send result and UI still follow ADR-0006 |
| Q38 | Workers + Hono + 1-min cron watcher + Queues + D1 | SUPERSEDED | ADR-0009, ADR-0010 |
| Q39 | Expo Push ticket and receipt check; `DeviceNotRegistered` deletes | IMPLEMENTED | #314: `push_receipts` in D1, cron `checkReceipts` (`apps/api/src/push.ts`) |
| Q40 | 12 words new, 12/24 restore, one path, no passphrase | SUPERSEDED | Optional restore passphrase: ADR-0003. Words and path still follow ADR-0002 |
| Q41 | Circle Sepolia USDC, 6 decimals | IMPLEMENTED | `packages/wallet-core/src/constants.ts` |
| Q42 | QR = address only; EIP-681 accepted; other chain stops | IMPLEMENTED | `shared/lib/qrAddress.ts` |
| Q43 | Phrase screen: no copy, capture block, switcher blur, screenshot fallback | GAP | #318: no screenshot fallback; no rooted-device warning |
| Q44 | Read-only Admin dashboard | SUPERSEDED | ADR-0012, #186 |
| Q45 | One React Router v7 project, `ssr:false`, prerendered landing | IMPLEMENTED | ADR-0001; Admin part ADR-0012 |
| Q46 | Review shows expected and max fee; re-review only if the cap rises | IMPLEMENTED | `packages/wallet-core/src/send.ts` |
| Q47 | Pending or Unknown blocks a new send | IMPLEMENTED | ADR-0006 |
| Q48 | No fiat value | IMPLEMENTED | `shared/ui/PortfolioBalance.tsx` |
| Q49 | Korean only; strings in i18n | IMPLEMENTED | `packages/i18n/src/ko.ts` |
| Q50 | Sentry crash and performance, PII scrubbed | SUPERSEDED | ADR-0024: performance monitoring dropped. Still holds and is built (#315): errors and crashes on the app (`apps/mobile/src/shared/lib/sentry.ts`) and the Worker (`apps/api/src/sentry.ts`), PII scrubbed (`packages/contracts/src/scrub.ts`). Source maps: #337 |
| Q51 | pnpm + Turborepo monorepo | IMPLEMENTED | `turbo.json` |
| Q52 | local/staging/prod; separate D1, secrets, EAS channel; web previews | GAP | #316: no EAS channels. Web previews off (`apps/web/AGENTS.md`) |
| Q53 | Zero-downtime release rules | GAP | #316: v1 add-only and migration lint (R16) are done; EAS Update and gradual deploy are not |
| Q54 | Risk-based tests; mobile E2E; device checklist | GAP | #316 |
| Q55 | CI/CD gates and release pipeline | GAP | #316: OpenAPI breaking-change diff (`ci.yml` `verify`), migration lint (R16) and the post-deploy staging smoke (`api-staging.yml`) are done; the rest is not |
| Q56 | 3 SLOs, alerts, JSON logs with request id, Analytics Engine | GAP | #336, #335. Built (#315): JSON logs with a request id (`apps/api/src/log.ts`), data points (`apps/api/src/metrics.ts`). Not built: reading the SLOs (#335), two of three alert conditions (#336). SLO targets: ADR-0020 |
| Q57 | Anonymous install id; never linked to an address | SUPERSEDED | ADR-0022: the link exists only while push is on |
| Q58 | All RPC via the proxy with failover; history cached on device | IMPLEMENTED | ADR-0007 |
| Q59 | `wallet-core` signing boundary; lint limits its importers | SUPERSEDED | #312: scope widened by the owner (2026-11-01) from send and backup to send, backup, restore and `shared/storage/keychain.ts`. The rest holds: `@vaultme/wallet-core/signer`, lint in `apps/mobile/eslint.config.mjs` and `apps/web/eslint.config.js`, test `apps/mobile/test/signer-import.test.ts` |
| Q60 | viem in `wallet-core`; explicit path; bigint units | IMPLEMENTED | `packages/wallet-core/package.json` |
| Q61 | zod + OpenAPI; breaking-change diff; generated client | GAP | #316: stale check and oasdiff diff vs the PR base are done (`ci.yml` `verify`); the client is hand-written on the shared zod contracts, not generated |
| Q62 | TanStack Query + persist; send state from `wallet-core`; one Zustand store | IMPLEMENTED | ADR-0021 (send state is the pure `deriveState`, not a reducer) |
| Q63 | Encrypted MMKV; key and token in Keychain | IMPLEMENTED | ADR-0004 |
| Q64 | Style Dictionary tokens; raw-value lint; web CSS Modules; light only | SUPERSEDED | #189: Tailwind theme from tokens. Dark mode: Q80 |
| Q65 | react-hook-form + zod resolver; rules from `wallet-core` | IMPLEMENTED | ADR-0021 |
| Q66 | Drizzle + drizzle-kit; migration lint on DROP/RENAME | GAP | #319: the migration lint is done (R16); Drizzle is not |
| Q67 | Vitest + fast-check, oasdiff, Workers pool + anvil, Maestro, Playwright | GAP | #316: no anvil, Maestro; oasdiff is done (`ci.yml` `verify`) |
| Q68 | ESLint, Prettier, Steiger, Stylelint; TS 6 | GAP | #319: no Stylelint |
| Q69 | Slack alerts with dedupe and recovery | GAP | #336. Channel is Sentry email, not Slack: ADR-0024. Built (#315): the 5xx spike (`apps/api/src/alerts.ts`). Not built: watcher stall, dead-letter, recovery message |
| Q70 | Library list | SUPERSEDED | #63: Solar icons. Sentry part: Q50 |
| Q71 | Address poisoning defenses; zero-value switch | IMPLEMENTED | `packages/history/src/items.ts` (`showZero`); S40 `ActivityRow` State=Caution (#313); S41 caution state `pages/activity/detail.tsx`, `cautionOf` (#334) |
| Q72 | Paste shows a compare notice | IMPLEMENTED | `packages/i18n/src/ko.ts` |
| Q73 | Safety values compiled in; hash on device; fee cap | IMPLEMENTED | ADR-0005 |
| Q74 | Supply chain: release age, scripts, `wallet-core` allow-list, osv-scanner, pinned actions | IMPLEMENTED | `pnpm-workspace.yaml`; `scripts/check-repo-rules.sh` R15; `.github/workflows/osv-scanner.yml` |
| Q75 | Push hardening: token enforcement, payload check, re-read on tap | IMPLEMENTED | `packages/contracts/src/push.ts` |
| Q76 | WCAG 2.2 AA, address a11y label, text size, motion | IMPLEMENTED | `shared/lib/address.ts`; screen reader run not recorded |
| Q77 | Replaced state unblocks send; push notifies | GAP | #331: no replaced push; it needs a server record of pending sends. State: ADR-0006 |
| Q78 | Infura primary, Alchemy fallback | IMPLEMENTED | ADR-0007 |
| Q79 | Burn and token-contract warnings | IMPLEMENTED | `packages/wallet-core/src/risk.ts` |
| Q80 | Dark mode and the added components | IMPLEMENTED | `shared/theme/index.tsx` |
| Q81 | Foundation in English; screens in Korean | IMPLEMENTED | `DESIGN.md` |
