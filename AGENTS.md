# VaultMe agent guide

VaultMe is a self-custody wallet for the Ethereum Sepolia testnet (learning and portfolio project, test funds only).
pnpm + Turborepo monorepo: `apps/mobile` (Expo), `apps/api`, `apps/web`, `packages/{wallet-core,tokens,i18n,contracts,config,api-client,history}`.

## Communication

Always talk to me like I have ADHD.
Explain all answers in Korean. Write short, simple sentences and concrete steps, following ASD-STE100 Simplified Technical English principles. Keep proper nouns and technical identifiers in their original language.
Put the main result first. Explain one point at a time.
When a choice is yours to make, take your recommended option and keep working; do not stop to confirm it. End the report with an owner check list: each choice, what you chose, and where to see it. The owner approves it or asks for a fix. Stop only for what the owner alone can do (secrets, payments, Library publish, device passcodes, the limits in this file).

## Commands

- `pnpm turbo run typecheck lint test` and `./scripts/check-repo-rules.sh`. Run `git config core.hooksPath .githooks` once per clone (pre-commit and pre-push run them).
- Turborepo: before you change `turbo.json` or turbo commands, read `docs/` inside the installed `turbo` package.

## Enforced rules

Code enforces these. Do not restate them in prose; read the check when it fails.

| Rule | Enforced by |
|---|---|
| App UI (mobile and web) uses `@vaultme/tokens` only (no raw hex, no numeric spacing/radius/type, no Tailwind arbitrary values, no landing-page gaps) | `scripts/check-repo-rules.sh` R2, R4, R5; `apps/web/eslint.config.js`, `apps/web/stylelint.config.mjs` (CSS) |
| Each shared UI primitive names its Figma node | R6 |
| No private keys, `.env` or worker secrets; recovery phrases only as the public test vectors listed in R10 | R1, R3, R8, R10 |
| No `CLAUDE.md` / `CLAUDE.local.md` anywhere (it stops Claude Code from reading this file) | R9 |
| README.md and README.ko.md stay in step | R7 |
| Markdown links and backticked repo paths in tracked `*.md` resolve | R11 |
| Tokens: raw values only in Primitive; Semantic and Component alias | `packages/tokens/test/hierarchy.test.ts`, `packages/tokens/build.mjs` |
| A PR that changes app screen code shows one light and one dark app-vs-Figma image per changed screen (web: per breakpoint 375, 768, 1280; mode in the alt text) | `.github/workflows/pr-description.yml` `figma-comparison` |
| PR body ≤ 3,500 characters and `Closes #N` (Renovate and Dependabot PRs exempt) | `.github/workflows/pr-description.yml` `check` |
| Code is Prettier-formatted and ESLint-clean with 0 warnings | pre-commit `lint-staged`, pre-push, CI `verify` |
| Mobile FSD layers: imports go down only, other slices only through their `index`, route files only re-export `src/shell` or `src/pages` | `apps/mobile/eslint.config.mjs` boundaries, `apps/mobile/steiger.config.mjs` |
| Every requirements decision Q1–Q81 has a ledger row; a gap links an issue; ADR-0021 libraries stay installed | R14 |
| Mobile E2E | A PR that changes `apps/mobile/**` or a package the app uses passes the Maestro smoke on the iOS simulator (create, restore, send up to the amount screen; never broadcasts); the full run is nightly on `main` | `.github/workflows/e2e.yml` job `e2e` (required check), flows in `apps/mobile/.maestro/`, rules in `docs/testing/e2e.md` |
| Typecheck, lint and tests pass | CI `verify`, pre-push hook |
| The web app: real 404 status, security headers, axe = 0, Lighthouse 4 × ≥95 (desktop and mobile), JS: static pages ≤ 100 KB, viewer (`/address`, `/tx`) ≤ 150 KB (153,600 B), counted as the gzip body of the app's own JS without response headers (ADR-0018; the lhci jobs run on the build without the third-party Web Analytics beacon, ADR-0017) | CI `web` (`apps/web/e2e`) and `lhci (desktop)` / `lhci (mobile)` (`lighthouserc.*.json`, JS size: `apps/web/scripts/js-budget.ts`; the intentional 404 skips 2 SEO audits: `is-crawlable`, `http-status-code`) |
| Test coverage stays at or above each package's floor | `coverage.thresholds` in each `vitest.config.ts` |
| No unused files, exports or dependencies, no unlisted dependencies (existing unused exports are frozen in a shrink-only baseline) | `knip.jsonc`, `scripts/knip-exports.mjs` + `scripts/knip-exports.baseline.json`, CI `verify` (`pnpm knip`) |
| The mobile app bundles for iOS and Android, each Hermes bundle ≤ 11 MiB | CI `verify` (`export:check`); `expo-doctor` reports only |
| Claude Code: no `--no-verify`, no force push or push to main; no edits to CLAUDE.md or generated files; edited files are formatted and linted; a turn with code changes ends only when typecheck and lint pass | `.claude/settings.json` hooks in `.claude/hooks/`; R12 tests `guard-bash.sh` |
| `@vaultme/wallet-core/signer` (keys, signing) is imported only in mobile features `send`, `backup`, `restore` and `shared/storage/keychain.ts`, never in `apps/web` | `no-restricted-imports` in `apps/mobile/eslint.config.mjs` and `apps/web/eslint.config.js`; `apps/mobile/test/signer-import.test.ts` |
| `packages/wallet-core` `dependencies`, `optionalDependencies` and `peerDependencies` together are exactly `viem` and `@scure/bip39`; `osv-scanner` fails a PR that adds a known vulnerability to `pnpm-lock.yaml`, and the weekly run fails on any known vulnerability in it (whether it blocks merge is a repo ruleset setting, not checked here) | `scripts/check-repo-rules.sh` R15; `.github/workflows/osv-scanner.yml` (`google/osv-scanner-action`, PR and weekly) |
| A change of `apps/api/src/db/schema.ts` comes with its generated migration (journal and `.sql` files agree); `apps/api/src` does not call `DB.prepare` (D1 goes through Drizzle) | CI `verify` (`pnpm --filter @vaultme/api db:check`, `apps/api/scripts/db-check.ts`); `apps/api/eslint.config.js` `no-restricted-syntax`; ADR-0029 |
| A PR does not break the API contract (oasdiff of `docs/openapi/v1.json` against the base, ERR level); a D1 migration has no `DROP COLUMN`, `DROP TABLE` or `RENAME` without `-- contract-ok: <reason>`; after a staging deploy one balance read and one history read pass | CI `verify` (`oasdiff-action`); `scripts/check-repo-rules.sh` R16 (`scripts/check-migrations.test.sh`); `api-staging.yml` smoke (runs only after merge) |
| pnpm installs only package versions published at least 7 days (10080 min) ago, security fixes too, no exceptions | `pnpm-workspace.yaml` `minimumReleaseAge`, R13; Renovate waits the same 7 days (`.github/renovate.json5`) |
| A Figma screen binds every number, color and text to the design system | `.claude/skills/vaultme-figma-screen` `audit.js` = 0 (run before you report done) |

When a review finding or an owner fix from a check list repeats, add a check (`scripts/check-repo-rules.sh` or a test) and list it here. Only if no check can detect it, add a lesson to `vaultme-review-lessons`.

## Production code

1. Think before coding. State your assumptions. If the request is unclear, ask; do not guess.
2. Simplest change that works. No speculative features, options or abstractions.
3. Surgical changes. Touch only what the task needs. Match the surrounding style. Report unrelated problems; do not fix them in passing.
4. Verifiable goals. Define how you will prove the result (a test, a check, a screenshot) before you start, and run it before you report done. A bug fix starts with a failing test.
5. Real data. New app code reads real data (wallet, chain, api, OS state), not mock or fixture values; tests may use fixtures. When real data needs an API token, key or credential, stop and ask the owner; do not fake it.

## Judgment rules

1. Figma (`NMXrn0q75G1SX2Bn1L1jP8`) is the SSOT for app screens. No screen, state or feature without a Figma frame. Change Figma first (owner-approved), then the app. For a new feature, grill the owner first (`mattpocock-skills:grilling`).
2. UI work uses the `vaultme-figma-screen` (Figma) and `vaultme-design-to-code` (app) skills. Preserve Figma node, master and property IDs. Do not publish the Library without owner review.
3. Wallet actions show account, network, asset, recipient or spender, amount or allowance, estimated fee and status. Never claim a security check, network or feature that is not implemented and checked.
4. When the owner did not choose a library, version, API, config or workaround: read the official docs first (ctx7), check the installed and latest stable version and deprecations, and prefer the official solution. A workaround gets a code comment with its reason and removal condition. Cite each source and version in the report and PR, and say what you could not check. Put these steps in delegated instructions too.
5. Report only what you ran and saw. Say what you could not check.
6. Code wins over docs that describe current behavior. If such a doc and the code disagree, follow the code and report the mismatch. An approved decision the code does not follow is a gap, not a stale doc: keep it, mark it GAP in `docs/decisions.md` with an issue, and ask the owner.
7. Accepted ADRs in docs/adr bind. If a change conflicts with one, stop and ask; to change a decision, write a new ADR that supersedes it.
8. Model tiers. Feature design, grilling, architecture decisions and planning use the top tier. Research and implementation use a lower tier. Conversational work needs a top-tier session; one-shot design analysis may go to a top-tier subagent. Tier-to-model mapping: `docs/agents/models.md`.

## Where things are

- Work steps (issue → branch → PR; work that changes no repo file needs no PR): `docs/agents/workflow.md`
- Architecture: `ARCHITECTURE.md`
- Decisions: `docs/adr/`; every approved requirements decision (Q1–Q81) and its status: `docs/decisions.md`
- Review: what a reviewer reads per path, the four axes, the output format and the learning loop: `REVIEW.md`
- Before you edit an area, read `ARCHITECTURE.md`, the ADRs that touch it and `.claude/skills/vaultme-review-lessons/SKILL.md`.
- Area rules: `apps/mobile/AGENTS.md`, `apps/web/AGENTS.md`, `packages/tokens/AGENTS.md` (loaded when you open a file there).

The main agent splits work, tracks it, and reviews results.
