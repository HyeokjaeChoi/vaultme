# Architecture

VaultMe is a self-custody wallet for Ethereum Sepolia. It holds test funds only.
This file describes what the code does today. Read `AGENTS.md` for rules and `docs/agents/` for workflow.

## Goals and non-goals

Goals:

- One EOA account (`m/44'/60'/0'/0/0`) from a BIP39 phrase. Send and receive ETH and Circle Sepolia USDC.
- The key and the signature never leave the phone.
- Show history. Send a push when a watched address gets a deposit or sends a transaction.

Non-goals (not built): other chains, other tokens, swap, multiple accounts, smart accounts, WalletConnect, cloud backup, ENS, address book, cancel of a pending send (staged after speed up, ADR-0031), an admin dashboard. In the web app, also no keys, no recovery phrase, no send, no fiat prices (see [ADR-0012](docs/adr/0012-web-scope-and-quality-bars.md)).

The web app (`apps/web`, landing + read-only address viewer) is in scope and partly built (issue #186): the 404 page, the CI gates and the staging deploy (#192), the ko/en landing page (#194) and the address viewer with ETH and USDC balances (#195) exist. The viewer history list (#196) and the transaction page `/tx#0x…` (#197, read by hash through `eth_getTransactionByHash` and the receipt) exist; production domains (#198) are not built. See ADR-0011, ADR-0012, ADR-0013 and `apps/web/AGENTS.md`.

## System map

Three deploy units (the app, the Worker, the web site). Everything else is a library.

```text
 phone (trusted)                      Cloudflare (partly trusted)             outside (untrusted)
┌─────────────────────────┐          ┌───────────────────────────┐
│ apps/mobile (Expo)      │  HTTPS   │ apps/api (one Worker)     │──► Infura -> Alchemy (RPC)
│  wallet-core: key, sign │ ───────► │  Hono routes, D1,         │──► Etherscan V2 (history)
│  Keychain: phrase       │ install  │  EtherscanBucket (DO),    │──► Expo Push ──► phone
│  MMKV: cache, tx record │ token    │  Cron 17 * * * *          │──► Alchemy Notify (address list)
└─────────────────────────┘          └───────────▲───────────────┘
                                                 │ POST /webhooks/alchemy (HMAC)
                                            Alchemy Notify
```

- `apps/mobile`: Expo dev build (no Expo Go). Holds keys, signs, shows state.
- `apps/api`: Cloudflare Worker `vaultme-api`, with `staging` and `production` envs in `wrangler.jsonc`. D1 binding `DB`. Durable Object `EtherscanBucket`. Four rate-limit bindings. One hourly cron.
- `apps/web`: a prerendered static site on Workers Static Assets (`vaultme-web`, `staging` and `production` envs in `wrangler.jsonc`). No Worker code. The viewer calls the API from the browser (ADR-0011).
- The API is a proxy and a notifier. It stores no history, no balances and no keys.

## Code map

Dependency direction: `apps/*` -> `packages/*`. `apps` never import each other. `packages` do not import `apps`.

### packages

- `wallet-core`: pure TypeScript on `viem` and `@scure/bip39`. No IO, no storage, no React.
  - Constants: `CHAIN`, `ASSETS`, `DERIVATION_PATH`, `ABS_MAX_FEE_WEI`, `BURN_ADDRESSES`.
  - `Mnemonic`: private fields. `toString` and `toJSON` return a mask.
  - Amounts: `toUnits`, `fromUnits`, `maxSendable`, `formatAmount`.
  - Send: `prepare` makes a `Review`. `signAndSubmit` signs and submits. `recipientRisk` classifies the recipient.
  - Send status: `deriveState`, `isFinal`, `isPolled` (see Invariants, ADR-0021).
- `contracts`: zod schemas that both sides use. Header names, error codes, `canonicalString`, RPC allow-list, history and push shapes, `USDC_SEPOLIA`. The API OpenAPI file comes from here. `scrub.ts` removes wallet data from text (Observability).
- `api-client`: the install-identity API client (`createApiClient`): register, signed token, retry on `unauthorized`, `426` (`onUpdateRequired`, `createUpdateGate`), typed `ApiError` and `RpcError`. The platform part is the `DeviceSigner` seam (public key, create key, sign, installId storage). The private key never crosses it. `fetch`, base URL and app version are passed in.
- `history`: the history module (`createHistory`: `list`, `more`, `cachedRow`, `findRow`) over a page-fetch seam and a cache seam. See History.
- `tokens`: Style Dictionary build of `packages/tokens/tokens.json` into `src/generated` (TS for mobile, `tokens.css` variables and a Tailwind v4 `theme.css` for web). Layers: Primitive, Semantic (light and dark), Component.
- `i18n`: Korean strings (`ko`) and an i18next instance.
- `perf`: performance measurements (ADR-0019). `cli.ts` has three commands: `hermes` (bundle sizes), `latency` (API p50 and p95 on staging with a throw-away install, run weekly by `.github/workflows/api-latency.yml`) and `baseline` (writes `docs/perf/baseline.json` and `baseline.md` from CI artifacts). The k6 benchmark (`k6/api.js`, weekly `api-bench.yml`) has a UX SLO that fails the job and a regression watch that only warns (ADR-0020, `docs/perf/slo.md`).
- `config`: shared ESLint and tsconfig, and the FSD layer preset (`fsd.js`, `steiger.js`). It holds the no-float rule for amount code.

### apps/api

- `app.ts`: Hono `OpenAPIHono` app. All routes, middleware order, the webhook route, `onError`.
- `auth.ts`: `requireSigned` (device signature), `issueToken`, `requireToken`, `limitInstall`.
- `rpc.ts`: `rpcAllowed` (allow-list) and `proxyRpc` (Infura, then Alchemy).
- `etherscan.ts`, `history.ts`, `bucket.ts`: `getHistory` calls Etherscan through the `EtherscanBucket` token bucket. `history.ts` is pure: merge, dedupe, order, cursor.
- `push.ts`: subscribe, unsubscribe, `verifyAlchemySignature`, `notificationsFor` (pure), `handleActivity`, `sweep`.
- `log.ts`, `metrics.ts`, `sentry.ts`, `alerts.ts`: observability (see Observability).
- `index.ts`: Worker entry inside `Sentry.withSentry`. `fetch` is the app. `scheduled` runs `sweep`, then `checkAlerts`.
- `db/`: `schema.ts` is the D1 schema (Drizzle); `index.ts` has `getDb` and `runBatch`. Every query goes through them (ADR-0029).
- `migrations/`: SQL for D1, written by `drizzle-kit generate` from `db/schema.ts` (0001-0004 by hand), with drizzle-kit's `meta/` beside it.

### apps/web

React Router framework mode, prerendered (`ssr: false`), `app/` follows the same FSD preset as the mobile app. Details and gates: `apps/web/AGENTS.md`.

- `routes/landing.tsx`: ko `/` and en `/en` (one component). `routes/address.tsx`: the viewer shell (`/address`, `/en/address`). It reads the address from the URL fragment and loads balances in the browser through `@vaultme/api-client` and `POST /v1/rpc`. `routes/not-found.tsx`: the real 404 (ADR-0013).
- `shared/api`, `shared/lib`, `shared/ui`: API client wiring, helpers, UI primitives. Copy comes from `@vaultme/i18n/web`.
- The web viewer's history list (#196) and transaction page (#197) exist; they are web-only and read through the API (no cache, ADR-0011).

### apps/mobile

Expo Router in `app/` has thin route files. They re-export a page from `src/pages` or a layout or guarded route from `src/shell`.
`src/` follows Feature-Sliced Design. Allowed import direction: `shell` -> `pages` -> `widgets` -> `features` -> `entities` -> `shared`.

- `shell` (the FSD app layer; Expo Router reserves `src/app` for routes): `RootLayout`, `TabsLayout`, providers, `LockGate` (with pure `reduceLock`), `UpdateGate`, and the send routes wrapped in the backup gate.
- `pages`: one folder per screen.
- `widgets`: `review-panel`, `activity-list`, `asset-picker`, `network-chips`, `backup-gate` (`useBackupGate`, `SendGuard`: backup, history and restore together).
- `features`: `send` (`runSend`, `txState`, `useTrackedTx`), `backup`, `restore`, `history`, `balances`, `faucet` (`FaucetRow`), `push` (S50 opt-in sheet, subscribe and unsubscribe, launch sync, tap route), `settings`.
- `entities`: `account`, `asset`, `transaction`. They hold fixtures, the Review view model, `txView` (re-exported from `@vaultme/history`) and the pending tx store (`readPendingTx`, `writePendingTx`).
- `shared`: `api` (wires `@vaultme/api-client` to the noble `DeviceSigner`, `nobleSigner`: key in Keychain, installId in kv), `chain` (`ChainPort`, the fake adapter and its sample balances), `storage` (`keychain`, `kv`), `auth`, `ui` (primitives), `theme`, `lib`.

The preset `packages/config/fsd.js` (eslint-plugin-boundaries, used by `apps/mobile/eslint.config.mjs` and `apps/web/eslint.config.js`) enforces the direction, and that another slice is imported only through its `index`. `shared/lib` files are each a public entry (web: `shared/ui` too). `packages/config/steiger.js` checks the folder structure. Each app passes its layer folder (mobile `src`, web `app`), route files and app layer (`shell`). Web: routes are `app/routes`, the app layer is `app/shell`. Only `wallet-core` is the signing boundary by design: key and signing code is the `@vaultme/wallet-core/signer` subpath, which lint allows only in mobile features `send`, `backup`, `restore` and `shared/storage/keychain.ts` (Q59).

`ChainPort` is the one chain interface. The real adapter calls `POST /v1/rpc`. If `EXPO_PUBLIC_API_URL` is not set, a fake adapter runs, nothing is sent, and the UI says so.

## Data flows

### Install auth

1. First call: the app makes an ECDSA P-256 device key (not the wallet key). It sends the public key to `POST /v1/installs`. The server returns `installId`.
2. `POST /v1/installs/token` is signed. Headers: `X-Install-Id`, `X-Timestamp`, `X-Nonce`, `X-Signature`. The signed text is `canonicalString`: method, path, installId, ts, nonce, body SHA-256.
3. The server checks, in order: header format, clock skew (300 s), install exists, signature, nonce unused. It stores the nonce in D1 until `ts + 300 s`.
4. The server returns a token: `<installId>.<exp>.<HMAC-SHA256(TOKEN_SECRET)>`. It lives 15 minutes. The server keeps no token state.
5. `/v1/rpc`, `/v1/history`, `/v1/tx/internal`, `/v1/push/*` need `Authorization: Bearer <token>`. The client retries once with a new token on `unauthorized`.

Every `/v1/*` call except `/v1/health` needs `X-App-Version`. A version below the minimum gets `426 update_required`: `MIN_WEB_VERSION` when the request has `X-Client: web`, else `MIN_APP_VERSION`. An `Origin` header that is not in `WEB_ORIGINS` gets `403`.

### Send

1. The user enters recipient, asset and amount. `prepare` checks them and returns a `Review` (fee cap, warnings, recipient risk).
2. The user confirms. The app reads the phrase from Keychain. The read is the OS authentication. A cancel signs nothing.
3. `runSend` fetches a fresh `ChainSnapshot` through `/v1/rpc`, then calls `signAndSubmit`.
4. `signAndSubmit` checks the fee cap again, signs, computes the hash with `keccak256(raw)`, and submits with `eth_sendRawTransaction`.
5. The hash the node reports must equal the local hash. If not, the result is `Unknown`.
6. The app saves one `PendingTx` record in MMKV. It polls every 15 s while the screen is focused (`useTrackedTx`, `deriveState`).

### History

App -> `POST /v1/history {address, cursor}` -> Worker calls Etherscan `txlist`, `txlistinternal`, `tokentx` -> merge, dedupe, sort -> up to 50 items, `nextCursor`, `incomplete`.

- Cache API caches a page for 30 s. The key uses a hash of the address, never the address.
- The cursor holds an 8-hex address hash, so a cursor from another address is refused (`400 invalid_cursor`).
- Etherscan calls pass through the `EtherscanBucket` Durable Object: at most 3 calls in any 1.2 s (2.5/s on average, a rolling window, not a refilling bucket: Etherscan free tier is 3 calls/s). One history page starts its 3 calls at once. A wait over 2 s gives `503 unavailable`.
- `POST /v1/tx/internal {hash}` -> Etherscan `txlistinternal&txhash=` -> `{items: [{from, to, value, ok}]}` (internal ETH transfers of one transaction, no cache, ADR-0015).
- A zero-value ERC-20 row is `out` only if the same response shows that the address sent the transaction. Else it is `in`. This stops address poisoning. The client hides an incoming zero-value row by default (the web viewer always). The mobile S63 switch "수량 0 거래 보기" (`zeroSetting`, default off) shows it with `caution: true`: S40 draws it as B/Row State=Caution (warning badge and a caution line). Own zero-value calls always show.
- The app keeps the last result in MMKV and shows it with its update time.
- `@vaultme/history` (`createHistory`) holds the client side: the list view (contract check, address-poisoning filter with the optional `showZero` dep read at each parse (the cache keeps the raw page, so `cachedRow` follows the switch; the S40 list reloads on a flip), cache fallback, the local send merged in, only the newest load answers) and the S41 row lookup. Seams: page fetch (the API client) and the cache slot. The local send is a mobile-only input. `HistoryView.nextCursor` and `more(address, cursor)` give the web viewer older pages (same contract check and poisoning filter, not cached); the web keeps no cache (the cache slot is empty), so a failed read has no rows to fall back on.
- Every row opens S41 (`/activity/<id>`, route param `hash` = row `id` = `<hash>:<seq>`). S41 shows that one movement: the local send record if the hash matches (full detail, fee, recheck), else the row from the cached result (`history.cachedRow`): no fee, no recheck, status 성공/실패 only (history has no confirmation state). A route param is a row id (`<hash>:<seq>`, from the list) or a bare hash (only a deep link `vaultme://activity/<hash>` sends one now; a push tap opens the list since #314). Lookup order: the local record; the cached page (a row id, or a hash with exactly one row); else a fresh first page (`history.findRow`, also written to the cache). One row -> S41; none -> "아직 내역에 없어요" with retry; fetch error, `update_required` or no address -> "내역을 불러오지 못했어요" with retry; several rows -> back to the list. Test-data mode keeps the example rows and redirects an unknown id to `/activity`. Limit: the Worker caches a page for 30 s and Etherscan may index late, so a push for a very new tx can show "not found" until the page refreshes; an immediate retry may return the same page. A row with `caution` (an incoming zero-value row, only with the S63 switch on) opens S41 with a warning Status notice on top ("주소를 사칭한 거래일 수 있어요"), no "이 거래는 성공했어요" sentence, and under the sender address "주의 · 처음 보는 주소예요" only when the sender is not among the addresses this wallet sent to (send recents, `useRecents`, and the sends of the loaded history; `cautionOf`), and only after the history has loaded without error (before that the line is hidden; only a caution row subscribes to the history). The history only holds the first page and the recents the last 3 recipients, so "처음 보는" means "not seen in these". Etherscan link on all variants, hidden when the adapter does not broadcast. Below the info block S41 (local send and history row) shows the 내부 이동 section (#239, ADR-0015): `useInternalTransfers` reads `POST /v1/tx/internal` (`readInternalTransfers`) apart from the screen's own data, with its own loading, error + retry (10 s deadline) and a hidden empty state; a failed internal read never touches the rest of S41. Not read in test-data mode (no API), for a reverted (failed) tx, or for a pending send. After a retry the result is announced to screen readers.

### Transaction push

1. `PUT /v1/push/subscription {address, expoToken}`: the Worker adds the address to the Alchemy Notify webhook, then stores one row per install. If Alchemy fails, nothing is kept (`503`).
2. `DELETE /v1/push/subscription`: the row is deleted first. The address goes to `push_unregister`. Alchemy removal is tried at once and retried by cron.
3. Alchemy sends `POST /webhooks/alchemy`. The Worker checks the HMAC (`X-Alchemy-Signature`), then `notificationsFor` selects events: ETH, or USDC by contract address; not zero; not a removed log (an own zero-value external ETH tx is kept only as a failure probe, step 4). One notification per address and tx; a received leg wins over a sent leg. Limit: if the send leg comes in an earlier webhook than the deposit leg, the push says send.
4. Every notified tx (deposits too, ADR-0026; one extra RPC call per deposit) gets one `eth_getTransactionReceipt` through the RPC proxy before the claim. A reorged-out tx has no receipt, so it is not pushed. For an own send (a `send` leg, or an own zero-value external tx) status `0x0` makes the push `failed` ("보낸 거래가 실패했어요"); a zero-value tx that did not fail is dropped. A tx whose receipt cannot be read (chain down, RPC error, no receipt yet, unknown status) is not claimed and gets no push; the webhook still sends the other pushes, then answers 5xx and Alchemy retries. Limit: this runs only for txs Alchemy reports; whether Alchemy reports every reverted tx is not verified. There is no `replaced` push (Q77, ADR-0030): the server keeps no record of pending sends or nonces.
5. The Worker sends to Expo (batches of 100). The payload is `kind` only (no hash). The text has no amount and no address. The id of each `ok` ticket goes to `push_receipts` (install, token, time).
6. `push_sent (install_id, ref)`, `ref` = tx hash, is claimed (`INSERT OR IGNORE`) before the Expo send and only the claimer sends. So Alchemy retries and parallel webhooks with other legs of the same tx push once; the first claimer's kind wins, so it may be send. A claim is released when its send fails. A `DeviceNotRegistered` ticket deletes the subscription.
7. Cron `17 * * * *` runs `sweep`: delete subscriptions of installs not seen for 30 days, delete installs not seen for 90 days (nonces cascade; Q31), purge `push_sent` and `push_receipts` older than 7 days, fetch the Expo receipts of ids at least 15 minutes old (`getReceipts`, 300 per request; `DeviceNotRegistered` deletes the subscription while it still has the pushed token; answered ids are deleted, ids without a receipt stay; an Expo failure keeps all), retry `push_unregister`.

App side (`features/push`):

- S50 "알림 켜기" (offered once, after the first copy or share on Receive) and the S62 switch ask the OS, get the Expo token, then `PUT`. The setting turns on only after the `PUT` succeeds.
- S62 off and wallet removal call `DELETE`. kv `push.unregisterPending` is set before a `DELETE` and before a `PUT` and cleared on success, so an interrupted or unanswered call is undone at the next launch.
- At launch `syncPush` finishes an owed `DELETE`, or re-sends address and token when the setting is on. Push operations run one at a time.
- A tap that starts a killed app is held until the route has left `/` (`launchDone`): the start route replaces itself with `/home`, and that replace would otherwise remove the opened list.
- A tap (after `PushData` parses) opens `/activity` (the 내역 list) at once, with no fetch and no wait. The payload has no hash, so there is no per-tx link (#314, Q29, ADR-0023). Older app builds still parse the old payload (`hash` required): they open nothing on a tap until the user updates. Only a repeated notification identifier is dropped (cold-start read plus listener). Test-data mode (no API) registers nothing.
- The Expo token uses the EAS `projectId` in `app.json` (`extra.eas.projectId`, project `@gurwo1007/vaultme`).

## Observability

Decisions Q26, Q50, Q56, Q69 (#315, ADR-0024). One rule for all of it: no address, tx hash, key, push token or phrase goes into a log line, an Analytics Engine data point or a Sentry event. (The Worker still sends addresses and hashes to Etherscan and Alchemy to do its job.)

- Scrubber: `packages/contracts/src/scrub.ts`. `scrubString` replaces an address, a tx hash (or longer hex), a bare 64-hex key, an Expo push token and a run of 12 or more lowercase words of 3 to 8 letters (a 12 or 24 word phrase; ordinary prose with short words is cut too, on purpose). `scrubEvent` (Sentry `beforeSend`) also drops the user and the request body, query, cookies and headers. `scrubBreadcrumb` keeps only the path of a network breadcrumb. Both apps use it. It is tested with fake values. It is pattern based and best effort: a phrase split by punctuation or with other words in between is not caught.
- API logs: `log.ts` `logEvent(level, event, fields)` writes one JSON line `{level, event, requestId, ...fields}`. The first middleware in `app.ts` gives each request a `crypto.randomUUID()` (kept across awaits with `AsyncLocalStorage`, compatibility flag `nodejs_als`; the cron run gets one too) and logs `request` with method, route pattern (`not_found` for an unmatched path), status and `duration_ms`. Every string field goes through `scrubString` as a last guard.
- Analytics Engine: binding `ANALYTICS`, dataset `vaultme_api` (local), `vaultme_api_staging`, `vaultme_api_production` (`wrangler.jsonc`; created at the first write). `metrics.ts` writes `indexes[0]` = event and low-cardinality `blobs`: `request` (route, status; ms), `push_latency` (push kind; seconds and a count), `push_ticket` and `push_receipt` (`ok` or the Expo error; a count). Push data is written per group with a count, because one invocation may write 250 data points at most. Reading it needs a Cloudflare token with Account Analytics read (owner, #335).
- Push latency (Q26): `recordLatencies` in `push.ts`. Per accepted Expo ticket: seconds from the block timestamp (`eth_getBlockByNumber` for the activity's `blockNum`, through the RPC proxy) to the moment Expo answered the batch. The block is read after the send and after the answer (`waitUntil`), so it delays neither a push, the release of an unsent claim nor the answer to Alchemy. A block that cannot be read logs `push_latency_unavailable`. The canonical time is the block timestamp, not the finality rule of the approved Q26 text.
- Sentry API: `@sentry/cloudflare` wraps the Worker (`index.ts`, options in `sentry.ts`). `SENTRY_DSN` is a plain var (a DSN only allows sending events), `ENVIRONMENT` is `dev`, `staging` or `production`. Errors only, no tracing. `dataCollection` is all off (the SDK 11 replacement of `sendDefaultPii`). Outgoing fetch breadcrumbs are dropped (the upstream URLs hold API keys). `handleError` sends the error to Sentry. Tests set `SENTRY_DSN` empty.
- Sentry mobile: `@sentry/react-native` with its Expo plugin and `apps/mobile/metro.config.mjs`. `initSentry` runs before the first render in `shell/RootLayout.tsx`; DSN in `app.json` `extra.sentryDsn`; `environment` from `EXPO_PUBLIC_ENV` (`staging` in the `development` EAS profile and `pnpm staging`), else `dev` in `__DEV__`. `sendDefaultPii` off, no tracing, no replay. Source-map upload is off (`disableAutoUpload`, #337).
- Alerts (Q69): the hourly cron `checkAlerts` counts the rows of D1 `server_errors` (one row per 5xx answer, only the time, written after the answer; a Hono client error such as malformed JSON is a 400 and not counted) of the last hour. 10 or more send `Sentry.captureMessage('API 5xx spike')` at level `error` with fingerprint `['alert', 'api-5xx-spike']`; a Sentry alert rule on that issue emails the owner (rule set in Sentry, not in code). The watcher-stall and dead-letter conditions have no source (push comes from a webhook, there is no queue): #336.
- Proving collection, with no secret and no open door:
  - API: `GET /v1/debug/sentry` throws only when `ENVIRONMENT` is `dev` (local `wrangler dev`); staging and production answer 404 like any unknown path. Run it with `pnpm --filter @vaultme/api exec wrangler dev`, then `curl -i -H 'X-App-Version: 1.0.0' localhost:8787/v1/debug/sentry`.
  - Mobile: a long press (1.5 s) on the version row in Settings sends a JS test error, flushes, then calls `Sentry.nativeCrash()`. The row exists in the app only when `__DEV__` or `EXPO_PUBLIC_ENV=staging` (`testCrashEnabled`); a release build has no way in. There is no visible change. Relaunch the app: the native crash report is sent at the next start. It needs a dev client built with the Sentry native module (`expo run:ios`).

## Invariants

- Amounts are `bigint` or decimal strings. `Number`, `parseFloat` and `parseInt` are banned in amount code (ESLint). `toUnits` does not round. `formatAmount` is display only: `floor` for balances, `exact` for review and detail.
- Chain ID, USDC address, decimals, derivation path and the fee cap are constants in `wallet-core`. The server never supplies them.
- Fee cap: `gasLimit * maxFeePerGas`. If it is above `ABS_MAX_FEE_WEI` (0.005 ETH), the send is `Blocked`. If it rose above the reviewed cap, the user must review again.
- A signed transaction must match the reviewed one. A new nonce means a new review.
- Key storage tiers:
  - Phrase: Keychain. `BIOMETRY_ANY_OR_DEVICE_PASSCODE`, `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`, no cloud sync.
  - MMKV encryption key: Keychain, `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, no auth. The lock gate can then read MMKV before the first render.
  - Device key for install auth: Keychain, separate from the wallet key.
  - MMKV (AES-256): lock state, pending tx, history cache, flags, recent recipients, TanStack Query cache (balances, with the wallet's public address in the key). No phrase.
- App state kinds (ADR-0021): server state in TanStack Query, send status derived by `wallet-core` `deriveState`, global UI state in one Zustand store, forms in react-hook-form. Done so far: the derivation in `wallet-core`; TanStack Query provider in `shell` with the cache persisted to MMKV (whitelist in `shared/query/persist.ts`), and the balance reads on it; the history reads (list and S41 row lookup), the amount-step snapshot and the review read, and the receipt reads of `useTrackedTx` (the query fetches facts only; the `PendingTx` record in MMKV stays the send status, written through `settleTx`). Only balances are persisted; the Zustand store in `shared/app-store` holds lock, backup and opt-in flags (hydrated synchronously from MMKV by `initAppStore` before the first render, same MMKV keys as before, `persist` middleware not used because it keeps one JSON key). The four forms (send recipient, send amount, restore, backup word check) run on react-hook-form: shapes in `packages/contracts` `forms.ts`, rules inside the resolvers in `features/*/model`: restore word list and checksum from `wallet-core`, amount balance and zero through `shared/lib/amount` over `wallet-core` `toUnits`, Max and the USDC fee shortfall from `sendLimits` (the shortfall only warns, Review blocks), word check through `wrongIndexes`. The web viewer reads (balance, history pages, tx detail, internal transfers) are TanStack Query too, in memory only (`apps/web/app/shared/api/query.tsx`, #291). Not yet: nothing of ADR-0021.
- Transaction state, from receipt facts only (`deriveState` in `wallet-core`):
  - A receipt for any own hash decides (ADR-0031: the record holds `hashes`, original first, then each speed-up replacement; a record without `hashes` has the one `hash`).
  - Receipt at or below the `safe` block: `Confirmed` (success) or `Failed` (reverted).
  - Receipt above `safe`: `Included`. If the receipt disappears: back to `Pending`.
  - No receipt for any own hash and the `safe` nonce is above ours: `Replaced`.
  - `Unknown` means the result is not known. Only a check moves it.
  - Time alone never changes a state. The app resends only when the user asks (speed up from S23 or S41, ADR-0031).
  - `Pending` or `Unknown` blocks a new send (`blocksNewSend`). A corrupt record also blocks.
- Recipient risk order: burn, token contract, look-alike (first 4 and last 4 hex), first-time, known.
- App lock: cold start is locked. Lock after 30 s in the background. `inactive` never starts the timer. A clock set back counts as locked.
- The phrase screen blocks screen capture while mounted.
- Addresses show in 4-character groups (`shared/lib/address.ts`). The `0x` prefix stays with the first group.
- Rate limits (Cloudflare binding, per location, approximate):
  - `POST /v1/installs`: 3 per 60 s per IP.
  - `/v1/rpc`, and `/v1/history` together with `/v1/tx/internal` (one shared budget): 300 per 60 s per IP, and 60 per 60 s per install.
  - `/v1/installs/token`, `/v1/push/*`: 60 per 60 s per install.
  - Over the limit: `429 rate_limited` with `Retry-After: 60`.
- Logs and responses never hold upstream URLs, API keys, upstream error bodies or addresses.

## API contract

`docs/openapi/v1.json` is generated from the zod routes (`pnpm --filter @vaultme/api openapi`). CI fails if it is stale (`openapi:check`).

- Error body: `{code, message, retryable}`. `code` comes from `ERROR_CODES` in `contracts`. The app maps an unknown code to `Unknown`.
- v1 allows added fields only. A breaking change needs `/v2`.
- `/v1/rpc` accepts one JSON-RPC request (no batch). Allowed methods are in `RPC_ALLOWED_METHODS`. `eth_call` only for USDC `balanceOf`. `eth_getBlockByNumber` only without full transactions. `eth_getTransactionByHash` only with one 32-byte hash. Upstream order: Infura, Alchemy, 5 s timeout. A JSON-RPC error inside a 200 is returned as is.
- `/webhooks/alchemy` is outside `/v1` and is not in the OpenAPI file. It uses an HMAC, not a token.

## Security model

- Trusted: the phone. Partly trusted: our Worker, and Sentry (receives scrubbed error events from the phone and the Worker; see Observability). Untrusted: RPC, Etherscan, Expo, Alchemy.
- The Worker cannot move funds. It holds no key and no signing power.
- The app does not trust server values for safety. The app computes the tx hash and checks the fee cap itself.
- A push is only a signal. The payload is parsed with `PushData`; the app must re-read the chain.
- Browsers: CORS allow-list from the `WEB_ORIGINS` var (comma-separated exact origins; staging `https://vaultme-staging.stack-line.dev`, production `https://vaultme.stack-line.dev`; ADR-0011). Any other `Origin` gets `403 origin_forbidden`. A request without `Origin` (the native app) is unchanged. CORS headers and preflight cover `/v1/*` only, not `/webhooks`. Same install protocol as mobile. Rate limits stay per install ID (and per IP on `/v1/installs`).
- Secrets are Worker secrets (`wrangler secret`, `.dev.vars` locally): `TOKEN_SECRET` (32+ chars), `INFURA_KEY`, `ALCHEMY_KEY`, `ETHERSCAN_API_KEY`, `ALCHEMY_*`, `EXPO_ACCESS_TOKEN`. A missing secret makes the route fail closed with `500`. `wrangler.jsonc` holds vars only.
- Supply chain: pnpm `minimumReleaseAge` 10080 min (7 days), `strictDepBuilds`, an explicit `allowBuilds` list, CI actions pinned by SHA. Renovate (`.github/renovate.json5`) proposes only versions 7 days old or older and automerges only npm patch and devDependency minor updates.
- Repo checks block committed keys, `.env` files, recovery phrases (except public test vectors) and `CLAUDE.md` files.
- Not implemented: root or jailbreak detection, SIWE ownership proof for push. Any install with a valid token can subscribe any address.

## Build, test and release

Tooling: pnpm 12, Turborepo, TypeScript 6, Node 24, Vitest. `turbo.json` tasks: `build`, `typecheck`, `lint`, `test`. Each depends on `^build` (tokens generate code).

Local:

- `pnpm turbo run typecheck lint test` and `scripts/check-repo-rules.sh`.
- Run `git config core.hooksPath .githooks` once. Pre-commit runs the repo rules. Pre-push adds typecheck, lint and test when code changed.
- API: `wrangler dev`, `pnpm --filter @vaultme/api db:migrate:local`. Tests run in the Workers runtime (`@cloudflare/vitest-plugin`) with D1 migrations applied. Reorg tests (`pnpm --filter @vaultme/api test:reorg`, `apps/api/test-reorg`) run the push webhook against a local anvil chain and reproduce a reorg with `evm_snapshot` and `evm_revert`; they need Foundry (`anvil`) and run in CI job `verify`.
- Mobile dev build (Expo Go does not work: it needs Keychain and MMKV):
  - From `apps/mobile`: `npx expo prebuild --clean`, then `npx expo run:ios` or `npx expo run:android`. The URL scheme is `vaultme`.
  - Set `EXPO_PUBLIC_API_URL` for the real API. Without it the fake chain is used. `pnpm staging <script>` (for example `pnpm staging ios`) sets the staging API; the EAS `development` profile in `apps/mobile/eas.json` sets it too.
  - Set `LANG` and `LC_ALL` to `en_US.UTF-8` for CocoaPods. Use JDK 17 to 21 for Android (not 26).
  - The iOS simulator cannot save the phrase: it has no device passcode. Test wallet creation on a real device, or on an Android emulator with a PIN.

CI (`.github/workflows`):

- `ci.yml`, on pull request and push to `main`: job `repo-rules` runs `scripts/check-repo-rules.sh` (R1 to R16). Job `verify` runs `prettier --check .`, `pnpm turbo run typecheck lint test`, the API reorg tests (`test:reorg`, Foundry), `openapi:check`, an `oasdiff` breaking-change check of `docs/openapi/v1.json` against the PR base (pull requests only), `pnpm knip` and the mobile `export:check` (`turbo boundaries` and `expo-doctor` only report). Job `web` builds `apps/web` and runs Playwright with axe and Lighthouse CI against `wrangler dev` (ADR-0012).
- `api-staging.yml`, on push to `main` that touches the API (and by hand): in the GitHub Environment `staging`, applies D1 migrations, runs `wrangler deploy --env staging`, then checks `/v1/health` and runs `pnpm --filter @vaultme/perf run smoke`: a signed install, one balance read (ETH and USDC) and one history read of the public Sepolia USDC contract.
- `web-staging.yml`, on push to `main` that touches `apps/web` or the packages it uses (and by hand): job `gate` repeats the `web` checks, then `deploy` publishes `vaultme-web-staging` at `vaultme-staging.stack-line.dev`.
- `claude-code-review.yml`: Claude reviews a PR once when it is opened as non-draft or marked ready, and again when the owner adds the `review` label. It uses the `vaultme-pr-review` skill and `REVIEW.md`, read from the PR base. `review-learn.yml` collects review findings weekly (Monday) for the learning loop in `REVIEW.md`.
- `pr-description.yml`, on pull request: `check` (body 3,500 characters or less, `Closes #N`). `figma-comparison` (light and dark app-vs-Figma images for each changed screen).

Release:

- Deployment environment (dev, staging, production) and chain network (local, Sepolia, mainnet) are separate axes. Every environment allows Sepolia only; staging is the only deployed environment, and production is created at the first public release (ADR-0025).
- Staging API: `api-staging.yml`; staging web: `web-staging.yml` (above). Production web has no workflow yet (#198). Production API: by hand, `wrangler d1 migrations apply DB --remote --env production`, then `wrangler deploy --env production`. No EAS config, no store build.
- Before the first run in a new env, create its D1 database once by hand (`wrangler d1 create vaultme-api-<env>`; no `database_id` in `wrangler.jsonc`, later runs find it by name). The workflow applies migrations before `wrangler deploy`, and `migrations apply` cannot create the database (staging run #2 failed this way).
- D1 migrations are forward-only SQL files. Change `apps/api/src/db/schema.ts`, run `pnpm --filter @vaultme/api db:generate` and commit the file; CI `db:check` fails when the schema has no migration (ADR-0029). A generated table rebuild (`__new_*`, `DROP TABLE`) can cascade-delete child rows and is not STRICT: read the ADR before adding `contract-ok`. Write changes so the old Worker still runs: add columns and tables, do not drop or rename in the same release. R16 fails a migration with `DROP COLUMN`, `DROP TABLE` or `RENAME` unless the file has a line `-- contract-ok: <reason>`.
- `MIN_APP_VERSION` (a var) forces old apps to update.
