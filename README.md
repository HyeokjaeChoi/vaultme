# VaultMe

[한국어](README.ko.md)

A self-custody wallet for Ethereum Sepolia testnet, built as a learning and portfolio project.

This monorepo holds the wallet logic, a React Native (Expo) app, the design tokens, and the design documents.
It does not hold a production wallet. Use test funds only.

> **Status: 2026-10-14**
> C1 (`packages/wallet-core`), C2a (the mobile UI with static screens), and Redesign A ("one screen, one question", [PR #10](https://github.com/HyeokjaeChoi/vaultme/pull/10)) are merged into `main`. C2b and C3 have not started. The design documents describe a target, not a running system: the app has no live network calls and the API and web apps do not exist yet.

## Start here

1. [Product scope](PRODUCT.md): purpose, constraints, and brand commitments.
2. [HLD](outputs/design/hld.md): goals, system parts, data flow, and threat model.
3. [LLD](outputs/design/lld.md): repository layout, library choices, interfaces, and defaults.
4. [UX flow](outputs/design/ux-flow.md): screens and flows.
5. [Decision record](outputs/vaultme-requirements-session.md): requirement decisions Q1 to Q77.
6. [Work workflow](docs/agents/workflow.md) and [AGENTS.md](AGENTS.md): how work is done in this repo.

The design documents are written in Korean.

## What it is

VaultMe is a seed-phrase wallet with one EVM account on Ethereum Sepolia. The first version targets ETH and Circle Sepolia USDC, send and receive, and transaction status.
The goals and the exclusions (multi-chain, Mainnet, Smart Account, token approval) are in [HLD section 1](outputs/design/hld.md).

The product keeps wallet actions readable: it shows the account, network, asset, recipient, amount, and fee before signing. A readable signature is not a safety guarantee.

## Repository structure

| Path | Role |
| --- | --- |
| `apps/mobile` | Expo app (`@vaultme/mobile`). Static screens built from the Figma design |
| `packages/wallet-core` | Pure TypeScript with viem: key derivation, amounts, risk checks, send state. No IO |
| `packages/tokens` | Design tokens generated from the token source with Style Dictionary |
| `packages/i18n` | Typed Korean strings with i18next |
| `packages/config` | Shared ESLint and TypeScript settings |
| `outputs/` | Design system documents, component contracts, and design docs in `outputs/design/` |
| `docs/` | Work workflow and the design-system retro |
| `scripts/` | `check-repo-rules.sh`, the fast repo rules |
| `.claude/skills/` | Project skills for Figma screens, design-to-code, and review lessons |

## Run and verify

You need Node 24 or newer and pnpm 11.17.0 (`packageManager` in `package.json`).

```sh
git config core.hooksPath .githooks   # once per clone
pnpm install
pnpm typecheck
pnpm lint
pnpm test
scripts/check-repo-rules.sh
```

Start the mobile app:

```sh
pnpm --filter @vaultme/mobile start   # Expo dev server
```

`packages/tokens` generates its TypeScript output on `build`. Its `typecheck`, `lint`, and `test` scripts run `build` first.
CI runs `scripts/check-repo-rules.sh` and `pnpm turbo run typecheck lint test` ([ci.yml](.github/workflows/ci.yml)).

## Design system

The Figma file is the design source: [VaultMe Foundation](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8).
`outputs/wallet-foundation.tokens.json` is the token value source, and `packages/tokens` turns it into app constants.
App code uses `@vaultme/tokens` for every color, spacing, radius, and type value. The [design language](outputs/VaultMe-DESIGN.md) and the [Foundation guide](outputs/wallet-foundation-guide.md) explain the values.
The rules and the reason for them are in [the retro](docs/retro/2026-10-13-design-system-not-applied.md).

## Workflow

One task is one GitHub issue, one branch, one pull request. CodeRabbit reviews each pull request.
The steps are in [docs/agents/workflow.md](docs/agents/workflow.md).

## README sync

`README.md` and `README.ko.md` have the same sections and the same link targets.
`scripts/check-repo-rules.sh` (rule R7) fails when the heading counts or the relative links differ, or when a linked file does not exist.
