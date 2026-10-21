# VaultMe agent guide

VaultMe is a self-custody wallet for the Ethereum Sepolia testnet (learning and portfolio project, test funds only).
pnpm + Turborepo monorepo: `apps/mobile` (Expo), `apps/api`, `packages/{wallet-core,tokens,i18n,contracts,config}`.

## Communication

Always talk to me like I have ADHD.
Explain all answers in Korean. Write short, simple sentences and concrete steps, following ASD-STE100 Simplified Technical English principles. Keep proper nouns and technical identifiers in their original language.
Put the main result first. Explain one point at a time.

## Commands

- Check everything: `pnpm turbo run typecheck lint test` and `scripts/check-repo-rules.sh` (pre-commit runs the script; `git config core.hooksPath .githooks` once per clone).
- Foundation tokens: `python3 work/build_foundation.py` after any token change.
- Turborepo: before you change `turbo.json` or turbo commands, read `docs/` inside the installed `turbo` package (`node -p "require.resolve('turbo/package.json')"`).

## Hard rules

1. Figma (`NMXrn0q75G1SX2Bn1L1jP8`) is the SSOT for app screens. Do not build a screen, state or feature that has no Figma frame. Change Figma first (owner-approved), then the app.
2. App UI uses `@vaultme/tokens` only, with the product scale 24/16/12/8 and screen padding 16. `scripts/check-repo-rules.sh` enforces it.
3. Never put a real recovery phrase or private key in Figma, code or docs. Only the public test vectors in `docs/agents/foundation.md` rule 4 are allowed.
4. Wallet actions show account, network, asset, recipient or spender, amount or allowance, estimated fee and status. Do not invent a security check, network or feature that is not implemented and checked.
5. When the owner did not choose a library, version, API or workaround, check the official docs first (ctx7) and cite the source and version (`docs/agents/workflow.md` "Decisions without owner direction").
6. Do not add `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` in any directory. It stops Claude Code from reading this file (`scripts/check-repo-rules.sh` R9). Personal notes go in `~/.claude/CLAUDE.md`.
7. Report only what you ran and saw. Say what you could not check.

## Read before you act

| When | Read |
|---|---|
| Any task | `docs/agents/workflow.md` (issue → branch → PR for repo changes; work that changes no repo file needs no PR) |
| Before you edit an area | `docs/agents/design-index.md` and `.claude/skills/vaultme-review-lessons/SKILL.md` |
| Any UI work (Figma or app) | `docs/agents/design-system.md` (completion gates, skills, comparison images) |
| Tokens, Figma source, components, icons, wallet copy | `docs/agents/foundation.md` (Foundation contract 1–17) |
| Product decisions | `outputs/vaultme-requirements-session.md` |

Skills under `.claude/skills/` hold scoped procedures. They must not contradict this file or `docs/agents/`.
Prefer a low-cost model for research and implementation. The main agent splits work, tracks it, and reviews results.
When a review finding repeats, add a lesson to `vaultme-review-lessons` and, if a script can detect it, a check to `scripts/check-repo-rules.sh`.
