# Architecture

VaultMe is a self-custody wallet for Ethereum Sepolia. It holds test funds only.
This file describes what the code does today. Read `AGENTS.md` for rules and `docs/agents/` for workflow.

## Goals and non-goals

Goals:
- One EOA account (`m/44'/60'/0'/0/0`) from a BIP39 phrase. Send and receive ETH and Circle Sepolia USDC.
- The key and the signature never leave the phone.
- Show history. Send a push when a watched address gets a deposit or sends a transaction.

Non-goals (not built): other chains, other tokens, swap, multiple accounts, smart accounts, WalletConnect, cloud backup, ENS, address book, speed-up or cancel, a web app, an admin dashboard.

## System map

Three deploy units. Everything else is a library.

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
- The API is a proxy and a notifier. It stores no history, no balances and no keys.

## Code map

Dependency direction: `apps/*` -> `packages/*`. `apps` never import each other. `packages` do not import `apps`.

### packages

- `wallet-core`: pure TypeScript on `viem` and `@scure/bip39`. No IO, no storage, no React.
  - Constants: `CHAIN`, `ASSETS`, `DERIVATION_PATH`, `ABS_MAX_FEE_WEI`, `BURN_ADDRESSES`.
  - `Mnemonic`: private fields. `toString` and `toJSON` return a mask.
  - Amounts: `toUnits`, `fromUnits`, `maxSendable`, `formatAmount`.
  - Send: `prepare` makes a `Review`. `signAndSubmit` signs and submits. `recipientRisk` classifies the recipient.
  - State: `reduce` and `canStartDraft` (see Invariants).
- `contracts`: zod schemas that both sides use. Header names, error codes, `canonicalString`, RPC allow-list, history and push shapes, `USDC_SEPOLIA`. The API OpenAPI file comes from here.
- `tokens`: Style Dictionary build of `packages/tokens/tokens.json` into `src/generated`. Layers: Primitive, Semantic (light and dark), Component.
- `i18n`: Korean strings (`ko`) and an i18next instance.
- `config`: shared ESLint and tsconfig. It holds the no-float rule for amount code.

### apps/api

- `app.ts`: Hono `OpenAPIHono` app. All routes, middleware order, the webhook route, `onError`.
- `auth.ts`: `requireSigned` (device signature), `issueToken`, `requireToken`, `limitInstall`.
- `rpc.ts`: `rpcAllowed` (allow-list) and `proxyRpc` (Infura, then Alchemy).
- `etherscan.ts`, `history.ts`, `bucket.ts`: `getHistory` calls Etherscan through the `EtherscanBucket` token bucket. `history.ts` is pure: merge, dedupe, order, cursor.
- `push.ts`: subscribe, unsubscribe, `verifyAlchemySignature`, `notificationsFor` (pure), `handleActivity`, `sweep`.
- `index.ts`: Worker entry. `fetch` is the app. `scheduled` runs `sweep`.
- `migrations/`: plain SQL for D1 (no ORM).

### apps/mobile

Expo Router in `app/` has thin route files. They re-export a page from `src/pages` or a layout or guarded route from `src/shell`.
`src/` follows Feature-Sliced Design. Allowed import direction: `shell` -> `pages` -> `widgets` -> `features` -> `entities` -> `shared`.

- `shell` (the FSD app layer; Expo Router reserves `src/app` for routes): `RootLayout`, `TabsLayout`, providers, `LockGate` (with pure `reduceLock`), `UpdateGate`, and the send routes wrapped in the backup gate.
- `pages`: one folder per screen.
- `widgets`: `review-panel`, `activity-list`, `asset-picker`, `network-chips`, `backup-gate` (`useBackupGate`, `SendGuard`: backup, history and restore together).
- `features`: `send` (`runSend`, `txState`, `useTrackedTx`), `backup`, `restore`, `history`, `balances`, `faucet` (`FaucetRow`), `push` (S50 opt-in sheet, subscribe and unsubscribe, launch sync, tap route), `settings`.
- `entities`: `account`, `asset`, `transaction`. They hold fixtures, the Review view model, `txView` and the pending tx store (`readPendingTx`, `writePendingTx`).
- `shared`: `api` (client), `chain` (`ChainPort`, the fake adapter and its sample balances), `storage` (`keychain`, `kv`), `auth`, `ui` (primitives), `theme`, `lib`.

`apps/mobile/eslint.config.mjs` (eslint-plugin-boundaries) enforces the direction, and that another slice is imported only through its `index`. `shared/lib` files are each a public entry. `apps/mobile/steiger.config.mjs` checks the folder structure. Only `wallet-core` is the signing boundary by design.

`ChainPort` is the one chain interface. The real adapter calls `POST /v1/rpc`. If `EXPO_PUBLIC_API_URL` is not set, a fake adapter runs, nothing is sent, and the UI says so.

## Data flows

### Install auth

1. First call: the app makes an ECDSA P-256 device key (not the wallet key). It sends the public key to `POST /v1/installs`. The server returns `installId`.
2. `POST /v1/installs/token` is signed. Headers: `X-Install-Id`, `X-Timestamp`, `X-Nonce`, `X-Signature`. The signed text is `canonicalString`: method, path, installId, ts, nonce, body SHA-256.
3. The server checks, in order: header format, clock skew (300 s), install exists, signature, nonce unused. It stores the nonce in D1 until `ts + 300 s`.
4. The server returns a token: `<installId>.<exp>.<HMAC-SHA256(TOKEN_SECRET)>`. It lives 15 minutes. The server keeps no token state.
5. `/v1/rpc`, `/v1/history`, `/v1/push/*` need `Authorization: Bearer <token>`. The client retries once with a new token on `unauthorized`.

Every `/v1/*` call except `/v1/health` needs `X-App-Version`. A version below `MIN_APP_VERSION` gets `426 update_required`. A request with an `Origin` header gets `403`.

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
- Etherscan calls pass through the `EtherscanBucket` Durable Object: 2.5 calls/s, no burst. A wait over 2 s gives `503 unavailable`.
- A zero-value ERC-20 row is `out` only if the same response shows that the address sent the transaction. Else it is `in`. This stops address poisoning.
- The app keeps the last result in MMKV and shows it with its update time.

### Transaction push

1. `PUT /v1/push/subscription {address, expoToken}`: the Worker adds the address to the Alchemy Notify webhook, then stores one row per install. If Alchemy fails, nothing is kept (`503`).
2. `DELETE /v1/push/subscription`: the row is deleted first. The address goes to `push_unregister`. Alchemy removal is tried at once and retried by cron.
3. Alchemy sends `POST /webhooks/alchemy`. The Worker checks the HMAC (`X-Alchemy-Signature`), then `notificationsFor` selects events: ETH, or USDC by contract address; not zero; not a removed log. A received transfer wins over a sent one.
4. The Worker sends to Expo (batches of 100). The payload has `kind` and `hash` only. The text has no amount and no address.
5. `push_sent (install_id, ref)` stops a second push when Alchemy retries. A `DeviceNotRegistered` ticket deletes the subscription.
6. Cron `17 * * * *` runs `sweep`: delete subscriptions of installs not seen for 30 days, purge `push_sent` older than 7 days, retry `push_unregister`.

App side (`features/push`):
- S50 "알림 켜기" (offered once, after the first copy or share on Receive) and the S62 switch ask the OS, get the Expo token, then `PUT`. The setting turns on only after the `PUT` succeeds.
- S62 off and wallet removal call `DELETE`. kv `push.unregisterPending` is set before a `DELETE` and before a `PUT` and cleared on success, so an interrupted or unanswered call is undone at the next launch.
- At launch `syncPush` finishes an owed `DELETE`, or re-sends address and token when the setting is on. Push operations run one at a time.
- A tap opens `/activity/<hash>` after `PushData` parses. Test-data mode (no API) registers nothing.
- The Expo token uses the EAS `projectId` in `app.json` (`extra.eas.projectId`, project `@gurwo1007/vaultme`).

## Invariants

- Amounts are `bigint` or decimal strings. `Number`, `parseFloat` and `parseInt` are banned in amount code (ESLint). `toUnits` does not round. `formatAmount` is display only: `floor` for balances, `exact` for review and detail.
- Chain ID, USDC address, decimals, derivation path and the fee cap are constants in `wallet-core`. The server never supplies them.
- Fee cap: `gasLimit * maxFeePerGas`. If it is above `ABS_MAX_FEE_WEI` (0.005 ETH), the send is `Blocked`. If it rose above the reviewed cap, the user must review again.
- A signed transaction must match the reviewed one. A new nonce means a new review.
- Key storage tiers:
  - Phrase: Keychain. `BIOMETRY_ANY_OR_DEVICE_PASSCODE`, `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`, no cloud sync.
  - MMKV encryption key: Keychain, `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, no auth. The lock gate can then read MMKV before the first render.
  - Device key for install auth: Keychain, separate from the wallet key.
  - MMKV (AES-256): lock state, pending tx, history cache, flags, recent recipients. No phrase.
- Transaction state, from receipt facts only (`deriveState`):
  - Receipt at or below the `safe` block: `Confirmed` (success) or `Failed` (reverted).
  - Receipt above `safe`: `Included`. If the receipt disappears: back to `Pending`.
  - No receipt and the `safe` nonce is above ours: `Replaced`.
  - `Unknown` means the result is not known. Only a check moves it.
  - Time alone never changes a state. The app never resends.
  - `Pending` or `Unknown` blocks a new send (`blocksNewSend`). A corrupt record also blocks.
  - `reduce` and `canStartDraft` in `wallet-core` model the same table. The app does not call them today. It uses `deriveState` and `blocksNewSend`.
- Recipient risk order: burn, token contract, look-alike (first 4 and last 4 hex), first-time, known.
- App lock: cold start is locked. Lock after 30 s in the background. `inactive` never starts the timer. A clock set back counts as locked.
- The phrase screen blocks screen capture while mounted.
- Addresses show in 4-character groups (`shared/lib/address.ts`). The `0x` prefix stays with the first group.
- Rate limits (Cloudflare binding, per location, approximate):
  - `POST /v1/installs`: 3 per 60 s per IP.
  - `/v1/rpc`, `/v1/history`: 300 per 60 s per IP, and 60 per 60 s per install.
  - `/v1/installs/token`, `/v1/push/*`: 60 per 60 s per install.
  - Over the limit: `429 rate_limited` with `Retry-After: 60`.
- Logs and responses never hold upstream URLs, API keys, upstream error bodies or addresses.

## API contract

`docs/openapi/v1.json` is generated from the zod routes (`pnpm --filter @vaultme/api openapi`). CI fails if it is stale (`openapi:check`).
- Error body: `{code, message, retryable}`. `code` comes from `ERROR_CODES` in `contracts`. The app maps an unknown code to `Unknown`.
- v1 allows added fields only. A breaking change needs `/v2`.
- `/v1/rpc` accepts one JSON-RPC request (no batch). Allowed methods are in `RPC_ALLOWED_METHODS`. `eth_call` only for USDC `balanceOf`. `eth_getBlockByNumber` only without full transactions. Upstream order: Infura, Alchemy, 5 s timeout. A JSON-RPC error inside a 200 is returned as is.
- `/webhooks/alchemy` is outside `/v1` and is not in the OpenAPI file. It uses an HMAC, not a token.

## Security model

- Trusted: the phone. Partly trusted: our Worker. Untrusted: RPC, Etherscan, Expo, Alchemy.
- The Worker cannot move funds. It holds no key and no signing power.
- The app does not trust server values for safety. The app computes the tx hash and checks the fee cap itself.
- A push is only a signal. The payload is parsed with `PushData`; the app must re-read the chain.
- The API is for the native app only. No CORS headers. A browser `Origin` is refused.
- Secrets are Worker secrets (`wrangler secret`, `.dev.vars` locally): `TOKEN_SECRET` (32+ chars), `INFURA_KEY`, `ALCHEMY_KEY`, `ETHERSCAN_API_KEY`, `ALCHEMY_*`, `EXPO_ACCESS_TOKEN`. A missing secret makes the route fail closed with `500`. `wrangler.jsonc` holds vars only.
- Supply chain: pnpm `minimumReleaseAge` 10080 min (7 days), `strictDepBuilds`, an explicit `allowBuilds` list, CI actions pinned by SHA. Renovate (`.github/renovate.json5`) proposes only versions 7 days old or older and automerges only npm patch and devDependency minor updates.
- Repo checks block committed keys, `.env` files, recovery phrases (except public test vectors) and `CLAUDE.md` files.
- Not implemented: root or jailbreak detection, Sentry or other crash reporting, SIWE ownership proof for push. Any install with a valid token can subscribe any address.

## Build, test and release

Tooling: pnpm 11, Turborepo, TypeScript 6, Node 24, Vitest. `turbo.json` tasks: `build`, `typecheck`, `lint`, `test`. Each depends on `^build` (tokens generate code).

Local:
- `pnpm turbo run typecheck lint test` and `scripts/check-repo-rules.sh`.
- Run `git config core.hooksPath .githooks` once. Pre-commit runs the repo rules. Pre-push adds typecheck, lint and test when code changed.
- API: `wrangler dev`, `pnpm --filter @vaultme/api db:migrate:local`. Tests run in the Workers runtime (`@cloudflare/vitest-plugin`) with D1 migrations applied.
- Mobile dev build (Expo Go does not work: it needs Keychain and MMKV):
  - From `apps/mobile`: `npx expo prebuild --clean`, then `npx expo run:ios` or `npx expo run:android`. The URL scheme is `vaultme`.
  - Set `EXPO_PUBLIC_API_URL` for the real API. Without it the fake chain is used.
  - Set `LANG` and `LC_ALL` to `en_US.UTF-8` for CocoaPods. Use JDK 17 to 21 for Android (not 26).
  - The iOS simulator cannot save the phrase: it has no device passcode. Test wallet creation on a real device, or on an Android emulator with a PIN.

CI (`.github/workflows`):
- `ci.yml`, on pull request and push to `main`: job `repo-rules` runs `scripts/check-repo-rules.sh` (R1 to R11). Job `verify` runs `pnpm turbo run typecheck lint test` and `openapi:check`.
- `api-staging.yml`, on push to `main` that touches the API (and by hand): in the GitHub Environment `staging`, applies D1 migrations, runs `wrangler deploy --env staging`, then checks `/v1/health`.
- `pr-description.yml`, on pull request: `check` (body 3,500 characters or less, `Closes #N`). `figma-comparison` (light and dark app-vs-Figma images for each changed screen).

Release:
- Staging API: `api-staging.yml` (above). Production API: by hand, `wrangler d1 migrations apply DB --remote --env production`, then `wrangler deploy --env production`. No EAS config, no store build.
- The first deploy of an env creates its D1 database (no `database_id` in `wrangler.jsonc`); later runs find it by name. Run it by hand once, because `migrations apply` cannot create the database.
- D1 migrations are forward-only SQL files. Write them so the old Worker still runs: add columns and tables, do not drop or rename in the same release.
- `MIN_APP_VERSION` (a var) forces old apps to update.
