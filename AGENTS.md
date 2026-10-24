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
| Markdown links and backticked repo paths in tracked `*.md` resolve | R11 |
| Tokens: raw values only in Primitive; Semantic and Component alias | `packages/tokens/test/hierarchy.test.ts`, `packages/tokens/build.mjs` |
| A PR that changes app screen code shows one light and one dark app-vs-Figma image per changed screen (mode in the alt text) | `.github/workflows/pr-description.yml` `figma-comparison` |
| PR body ≤ 3,500 characters and `Closes #N` (Renovate and Dependabot PRs exempt) | `.github/workflows/pr-description.yml` `check` |
| Code is Prettier-formatted and ESLint-clean with 0 warnings | pre-commit `lint-staged`, pre-push, CI `verify` |
| Mobile FSD layers: imports go down only, other slices only through their `index`, route files only re-export `src/shell` or `src/pages` | `apps/mobile/eslint.config.mjs` boundaries, `apps/mobile/steiger.config.mjs` |
| Typecheck, lint and tests pass | CI `verify`, pre-push hook |
| Test coverage stays at or above each package's floor | `coverage.thresholds` in each `vitest.config.ts` |
| No unused files or dependencies, no unlisted dependencies | `knip.jsonc`, CI `verify` (`pnpm knip`) |
| The mobile app bundles for iOS and Android | CI `verify` (`export:check`); `expo-doctor` reports only |
| Claude Code: no `--no-verify`, no force push or push to main; no edits to CLAUDE.md or generated files; edited files are formatted and linted; a turn with code changes ends only when typecheck and lint pass | `.claude/settings.json` hooks in `.claude/hooks/` |
| pnpm installs only package versions published at least 7 days (10080 min) ago | `pnpm-workspace.yaml` `minimumReleaseAge`; Renovate waits the same 7 days (`.github/renovate.json5`) |
| A Figma screen binds every number, color and text to the design system | `.claude/skills/vaultme-figma-screen` `audit.js` = 0 (run before you report done) |

When a review finding repeats, add a check (`scripts/check-repo-rules.sh` or a test) and list it here. Only if no check can detect it, add a lesson to `vaultme-review-lessons`.

## Production code

1. Think before coding. State your assumptions. If the request is unclear, ask; do not guess.
2. Simplest change that works. No speculative features, options or abstractions.
3. Surgical changes. Touch only what the task needs. Match the surrounding style. Report unrelated problems; do not fix them in passing.
4. Verifiable goals. Define how you will prove the result (a test, a check, a screenshot) before you start, and run it before you report done. A bug fix starts with a failing test.

## Judgment rules

1. Figma (`NMXrn0q75G1SX2Bn1L1jP8`) is the SSOT for app screens. No screen, state or feature without a Figma frame. Change Figma first (owner-approved), then the app. For a new feature, grill the owner first (`mattpocock-skills:grilling`).
2. UI work uses the `vaultme-figma-screen` (Figma) and `vaultme-design-to-code` (app) skills. Preserve Figma node, master and property IDs. Do not publish the Library without owner review.
3. Wallet actions show account, network, asset, recipient or spender, amount or allowance, estimated fee and status. Never claim a security check, network or feature that is not implemented and checked.
4. When the owner did not choose a library, version, API, config or workaround: read the official docs first (ctx7), check the installed and latest stable version and deprecations, and prefer the official solution. A workaround gets a code comment with its reason and removal condition. Cite each source and version in the report and PR, and say what you could not check. Put these steps in delegated instructions too.
5. Report only what you ran and saw. Say what you could not check.
6. Code wins over docs. If a doc and the code disagree, follow the code and report the mismatch.
7. Accepted ADRs in docs/adr bind. If a change conflicts with one, stop and ask; to change a decision, write a new ADR that supersedes it.

## Where things are

- Work steps (issue → branch → PR; work that changes no repo file needs no PR): `docs/agents/workflow.md`
- Architecture: `ARCHITECTURE.md`
- Decisions: `docs/adr/`
- Before you edit an area, read `ARCHITECTURE.md`, the ADRs that touch it and `.claude/skills/vaultme-review-lessons/SKILL.md`.
- Area rules: `apps/mobile/AGENTS.md`, `packages/tokens/AGENTS.md` (loaded when you open a file there).

Prefer a low-cost model for research and implementation. The main agent splits work, tracks it, and reviews results.
