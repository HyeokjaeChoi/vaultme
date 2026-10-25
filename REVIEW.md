# Review guide

Read this before you review a VaultMe PR. It applies to any AI reviewer (Claude and Qodo today) and to people.
It is an index: it names the files to read and the questions to ask. The rules stay in the files it names.
Claude runs it as the [vaultme-pr-review](.claude/skills/vaultme-pr-review/SKILL.md) skill, in CI and locally.

CI reads this file and every file it names from the PR base branch, not from the PR head
(`.github/workflows/claude-code-review.yml`). A PR that changes a rule is reviewed against the old rule.

A review answers two questions:

1. **Requirements.** Does the PR do what its linked issue (`Closes #N`) and that issue's parent spec ask?
   Check each acceptance criterion against the code and tests: met, gap, or not checkable here.
2. **Quality.** Does the change keep the four axes below?

Read beyond the diff: the callers and callees of each changed symbol, the files that render or run it, and its tests.
A bug may depend on input, state, concurrency or async order; report it with a concrete failure scenario.

## Do not flag

- Rules in the [AGENTS.md](AGENTS.md) "Enforced rules" table. A check enforces each one; CI fails without you.
- What a linter, type check or test already catches.

## Always read

- [AGENTS.md](AGENTS.md): "Production code" and "Judgment rules".
- [vaultme-review-lessons](.claude/skills/vaultme-review-lessons/SKILL.md): findings that came back more than once.
- The area `AGENTS.md` of each changed path, if there is one.

## Read per path

High risk = keys, signing, amounts, fees or transaction state. In a high-risk path, read every file in its row.

| Changed path | Risk | Also read |
|---|---|---|
| `packages/wallet-core/` | high | [ARCHITECTURE.md](ARCHITECTURE.md) "Invariants", ADR [0002](docs/adr/0002-seed-phrase-eoa-single-path.md), [0003](docs/adr/0003-restore-optional-bip39-passphrase.md), [0005](docs/adr/0005-safety-values-compiled-into-app.md), [0006](docs/adr/0006-send-status-follows-chain-facts.md), [CONTEXT.md](CONTEXT.md) |
| `apps/mobile/src/features/{send,backup,restore}/`, `apps/mobile/src/shared/{storage,api,auth}/`, `apps/mobile/src/entities/transaction/`, `apps/mobile/src/widgets/{review-panel,backup-gate}/`, `apps/mobile/src/shell/` | high | [ARCHITECTURE.md](ARCHITECTURE.md) "Invariants" and "Security model", ADR [0004](docs/adr/0004-two-tier-secret-storage.md), [0005](docs/adr/0005-safety-values-compiled-into-app.md), [0006](docs/adr/0006-send-status-follows-chain-facts.md), [0008](docs/adr/0008-anonymous-install-identity.md), [CONTEXT.md](CONTEXT.md) |
| `apps/mobile/` (other) | normal | [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md) "apps/mobile", ADR [0007](docs/adr/0007-chain-data-only-through-api-proxy.md), [CONTEXT.md](CONTEXT.md), [PRODUCT.md](PRODUCT.md) |
| `apps/api/`, `packages/contracts/`, `packages/api-client/` | high | [ARCHITECTURE.md](ARCHITECTURE.md) "Invariants", "API contract" and "Security model", ADR [0007](docs/adr/0007-chain-data-only-through-api-proxy.md), [0008](docs/adr/0008-anonymous-install-identity.md), [0009](docs/adr/0009-api-on-workers-hono-d1.md), [0010](docs/adr/0010-push-from-alchemy-webhook.md), [0011](docs/adr/0011-web-client-api-access.md) |
| `packages/history/` | normal | [ARCHITECTURE.md](ARCHITECTURE.md) "History", ADR [0006](docs/adr/0006-send-status-follows-chain-facts.md) |
| `apps/web/` | normal | [apps/web/AGENTS.md](apps/web/AGENTS.md), ADR [0001](docs/adr/0001-web-hosting-workers-static-assets.md), [0011](docs/adr/0011-web-client-api-access.md), [0012](docs/adr/0012-web-scope-and-quality-bars.md), [0013](docs/adr/0013-web-404-page-handling.md), [0014](docs/adr/0014-web-network-and-read-only-statements.md), [PRODUCT.md](PRODUCT.md) |
| `packages/tokens/` | normal | [packages/tokens/AGENTS.md](packages/tokens/AGENTS.md), [DESIGN.md](DESIGN.md) |
| `packages/i18n/` | normal | [CONTEXT.md](CONTEXT.md), [PRODUCT.md](PRODUCT.md) "Brand Commitments" |
| `.github/`, `scripts/`, `.claude/`, `packages/config/` | normal | [docs/agents/workflow.md](docs/agents/workflow.md), [ARCHITECTURE.md](ARCHITECTURE.md) "Security model" (supply chain) |
| `*.md` | normal | [AGENTS.md](AGENTS.md) Judgment rule 6: code wins over docs. Flag a doc that now disagrees with the code. |

## Four axes

Ask each question of the changed code. Flag only a clear break of a named source.

1. **Domain.** Does the change break an invariant in [ARCHITECTURE.md](ARCHITECTURE.md) "Invariants", an accepted ADR,
   or [AGENTS.md](AGENTS.md) Judgment rule 3 (what a wallet action shows)? Does copy use the [CONTEXT.md](CONTEXT.md) terms?
2. **Code pattern.** Does it follow the area `AGENTS.md`, the [ARCHITECTURE.md](ARCHITECTURE.md) "Code map" seams
   (`ChainPort`, `DeviceSigner`, `wallet-core` as the only signing boundary) and the lessons?
3. **Optimization.** Does it add work the design avoids: an RPC or API call per render or per list row
   (rate limits in "Invariants"), app JS on a static web page ([apps/web/AGENTS.md](apps/web/AGENTS.md), ADR 0012),
   or a dependency that a few lines or an installed package covers ([AGENTS.md](AGENTS.md) "Production code" rule 2)?
4. **Performance.** Does it risk a budget below? A budget is the measured fact; do not guess numbers.

## Performance budgets

Each entry names the check that measures it. A new entry needs its check in the same PR.

| Budget | Measured by |
|---|---|
| Web: Lighthouse scores, desktop and mobile (values: [AGENTS.md](AGENTS.md) "Enforced rules") | [lighthouserc.desktop.json](apps/web/lighthouserc.desktop.json), [lighthouserc.mobile.json](apps/web/lighthouserc.mobile.json), CI `web` |
| Web: static-page JS size | `resource-summary:script:size` in the same files, CI `web` |
| Mobile: iOS and Android bundle | `export:check` in [apps/mobile/package.json](apps/mobile/package.json), CI `verify` |
| Mobile: Hermes bundle size and count | `export:check` (the `find` steps), CI `verify` |

## Output

- Each finding has a severity ([workflow.md](docs/agents/workflow.md) step 10): **Critical** (funds, keys, signing,
  security or data loss), **Major** (wrong result on a reachable input or state, or an unmet acceptance criterion),
  **Minor** (other real problems).
- Each finding gives the failure scenario, the code evidence, and its source: the file and section, ADR number,
  invariant, lesson ID or acceptance criterion, with a link. A bug with no rule source cites the behavior the code
  promises (a type, a doc comment, the issue).
- Drop what the code does not back. A summary lists each acceptance criterion with its status and the files read.

## Learning loop

`.github/workflows/review-learn.yml` runs once a week. It reads the review findings on PRs merged in the last 30 days
and the answers to them (fixed, or rejected with a reason). For a repeated finding (2 PRs, or twice in one PR)
with at least one case in the last 7 days, it proposes a check first ([AGENTS.md](AGENTS.md) "Enforced rules"), and a lesson only if no check can detect it.
It counts Claude, Qodo and write-access reviewers. It opens one issue and one draft PR. The owner reviews and merges it; nothing reaches `main` without that.
