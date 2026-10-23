# VaultMe agent guide

VaultMe is a self-custody wallet for the Ethereum Sepolia testnet (learning and portfolio project, test funds only).
pnpm + Turborepo monorepo: `apps/mobile` (Expo), `apps/api`, `packages/{wallet-core,tokens,i18n,contracts,config}`.

## Communication

Always talk to me like I have ADHD.
Explain all answers in Korean. Write short, simple sentences and concrete steps, following ASD-STE100 Simplified Technical English principles. Keep proper nouns and technical identifiers in their original language.
Put the main result first. Explain one point at a time.

## Commands

- `pnpm turbo run typecheck lint test` and `./scripts/check-repo-rules.sh`. Run `git config core.hooksPath .githooks` once per clone (pre-commit and pre-push run them).
- Turborepo: before you change `turbo.json` or turbo commands, read `docs/` inside the installed `turbo` package.

## Enforced rules

Code enforces these. Do not restate them in prose; read the check when it fails.

| Rule | Enforced by |
|---|---|
| App UI uses `@vaultme/tokens` only (no raw hex, no numeric spacing/radius/type, no landing-page gaps) | `scripts/check-repo-rules.sh` R2, R4, R5 |
| Each shared UI primitive names its Figma node | R6 |
| No private keys, `.env` or worker secrets; recovery phrases only as the public test vectors listed in R10 | R1, R3, R8, R10 |
| No `CLAUDE.md` / `CLAUDE.local.md` anywhere (it stops Claude Code from reading this file) | R9 |
| README.md and README.ko.md stay in step | R7 |
| Tokens: raw values only in Primitive; Semantic and Component alias | `packages/tokens/test/hierarchy.test.ts`, `packages/tokens/build.mjs` |
| A PR that changes app screen code shows one light and one dark app-vs-Figma image per changed screen (mode in the alt text) | `.github/workflows/pr-description.yml` `figma-comparison` |
| PR body ≤ 3,500 characters and `Closes #N` | `.github/workflows/pr-description.yml` `check` |
| Code is Prettier-formatted and ESLint-clean with 0 warnings | pre-commit `lint-staged`, pre-push, CI `verify` |
| Typecheck, lint and tests pass | CI `verify`, pre-push hook |
| pnpm installs only package versions published at least 7 days (10080 min) ago | `pnpm-workspace.yaml` `minimumReleaseAge` |
| A Figma screen binds every number, color and text to the design system | `.claude/skills/vaultme-figma-screen` `audit.js` = 0 (run before you report done) |

When a review finding repeats, add a check (`scripts/check-repo-rules.sh` or a test) and list it here. Only if no check can detect it, add a lesson to `vaultme-review-lessons`.

## Judgment rules

1. Figma (`NMXrn0q75G1SX2Bn1L1jP8`) is the SSOT for app screens. No screen, state or feature without a Figma frame. Change Figma first (owner-approved), then the app. For a new feature, grill the owner first (`mattpocock-skills:grilling`).
2. UI work uses the `vaultme-figma-screen` (Figma) and `vaultme-design-to-code` (app) skills. Preserve Figma node, master and property IDs. Do not publish the Library without owner review.
3. Wallet actions show account, network, asset, recipient or spender, amount or allowance, estimated fee and status. Never claim a security check, network or feature that is not implemented and checked.
4. When the owner did not choose a library, version, API, config or workaround: read the official docs first (ctx7), check the installed and latest stable version and deprecations, and prefer the official solution. A workaround gets a code comment with its reason and removal condition. Cite each source and version in the report and PR, and say what you could not check. Put these steps in delegated instructions too.
5. Report only what you ran and saw. Say what you could not check.

## Where things are

- Work steps (issue → branch → PR; work that changes no repo file needs no PR): `docs/agents/workflow.md`
- Before you edit an area, read its sources in `docs/agents/design-index.md` and `.claude/skills/vaultme-review-lessons/SKILL.md`.
- Product decisions: `outputs/vaultme-requirements-session.md`

Prefer a low-cost model for research and implementation. The main agent splits work, tracks it, and reviews results.
