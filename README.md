# VaultMe

[한국어](README.ko.md)

A self-custody wallet for Ethereum Sepolia testnet, built as a learning and portfolio project.

This monorepo holds the wallet logic, a React Native (Expo) app, the design tokens, and the design documents.
It does not hold a production wallet. Use test funds only.

> **Status: 2026-10-25**
> C1 (`packages/wallet-core`), C2a (the mobile UI with static screens), Redesign A ("one screen, one question", [PR #10](https://github.com/HyeokjaeChoi/vaultme/pull/10)), and C2b (secure storage, backup, restore, app lock, and send) are merged into `main`. C2b uses a fake chain adapter. C3-6 (#43) adds the real chain adapter and API client: when `EXPO_PUBLIC_API_URL` is set the app registers an install and uses `POST /v1/rpc`; when it is not set the fake adapter still runs and no transaction leaves the device. `POST /v1/history` is wired too. The web app (`apps/web`) has the landing page (ko/en), the 404 page, and a read-only address viewer with ETH and USDC balances on staging; the viewer history list is in progress ([#196](https://github.com/HyeokjaeChoi/vaultme/issues/196)). [ARCHITECTURE.md](ARCHITECTURE.md) describes what the code does today.

## Start here

1. [Product scope](PRODUCT.md): purpose, constraints, and brand commitments.
2. [ARCHITECTURE.md](ARCHITECTURE.md): goals, system parts, data flows, invariants, and the security model.
3. [Decisions](docs/adr/): accepted architecture decision records (ADR).
4. [Work workflow](docs/agents/workflow.md) and [AGENTS.md](AGENTS.md): how work is done in this repo.

ARCHITECTURE.md and the ADRs are written in English.

## What it is

VaultMe is a seed-phrase wallet with one EVM account on Ethereum Sepolia. The first version targets ETH and Circle Sepolia USDC, send and receive, and transaction status.
The goals and the exclusions (multi-chain, Mainnet, Smart Account, token approval) are in [ARCHITECTURE.md](ARCHITECTURE.md#goals-and-non-goals).

The product keeps wallet actions readable: it shows the account, network, asset, recipient, amount, and fee before signing. A readable signature is not a safety guarantee.

## Repository structure

| Path | Role |
| --- | --- |
| `apps/mobile` | Expo app (`@vaultme/mobile`). Screens built from the Figma design, wired to `wallet-core`, device storage and the API (a fake chain when `EXPO_PUBLIC_API_URL` is not set) |
| `apps/api` | Cloudflare Worker (`@vaultme/api`), Hono and D1: RPC proxy, history, push |
| `apps/web` | Static web app (`@vaultme/web`), React Router prerendered on Cloudflare Workers Static Assets. The landing page (ko/en), the 404 page, and a read-only address viewer with balances; the history list is in progress (#196) |
| `packages/wallet-core` | Pure TypeScript with viem: key derivation, amounts, risk checks, send state. No IO |
| `packages/contracts` | zod schemas that the app, the web app and the API share |
| `packages/api-client` | The install-identity API client (`createApiClient`) |
| `packages/history` | The history list and row lookup module |
| `packages/tokens` | Design tokens generated from the token source with Style Dictionary |
| `packages/i18n` | Typed Korean strings with i18next |
| `packages/config` | Shared ESLint and TypeScript settings |
| `ARCHITECTURE.md` | What the code does today: parts, data flows, invariants, security model |
| `docs/` | Work workflow, ADRs (`docs/adr/`), and the OpenAPI file |
| `scripts/` | `check-repo-rules.sh`, the fast repo rules |
| `.claude/skills/` | Project skills for Figma screens, design-to-code, and review lessons |

## Run and verify

You need Node 24 or newer and pnpm 12.14.0 (`packageManager` in `package.json`).

```sh
git config core.hooksPath .githooks   # once per clone
pnpm install
pnpm typecheck
pnpm format:check
pnpm lint
pnpm test
scripts/check-repo-rules.sh
```

Start the mobile app:

```sh
pnpm --filter @vaultme/mobile start   # Expo dev server
```

`packages/tokens` generates its TypeScript output on `build`. Its `typecheck`, `lint`, and `test` scripts run `build` first.
The pre-commit hook runs ESLint `--fix` and Prettier on staged files. CI runs `scripts/check-repo-rules.sh`, `prettier --check .`, `pnpm turbo run typecheck lint test`, the API `openapi:check`, `pnpm knip`, the mobile bundle check and the web gates ([ci.yml](.github/workflows/ci.yml)).

## Design system

The Figma file is the design source: [VaultMe Foundation](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8).
`packages/tokens/tokens.json` is the token value source, and `packages/tokens` turns it into app constants.
App code uses `@vaultme/tokens` for every color, spacing, radius, and type value. [DESIGN.md](DESIGN.md) explains the values and the rules that cross components. [CONTEXT.md](CONTEXT.md) holds the product terms.

## Workflow

One task is one GitHub issue, one branch, one pull request. Claude reviews each pull request.
The steps are in [docs/agents/workflow.md](docs/agents/workflow.md).

## README sync

`README.md` and `README.ko.md` have the same sections and the same link targets.
`scripts/check-repo-rules.sh` (rule R7) fails when the heading counts or the relative links differ, or when a linked file does not exist.
