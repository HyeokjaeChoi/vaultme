# Work workflow

A repository change (code, tokens, docs, CI) = one GitHub issue = one branch = one PR.
Work that changes no repository file (Figma-only edits, including small design fixes) needs no issue or PR. Link the result (frame IDs, audit result) in the related issue or PR.
Figma screen gates still apply (`AGENTS.md` "Enforced rules").

## Steps

1. Create an issue in this repo. Add it to the GitHub Project "VaultMe". Set Status `Todo`.
   `gh issue create --title "<type>: <summary>" --body-file <file> --label <area>` then
   `gh project item-add <project-number> --owner HyeokjaeChoi --url <issue-url>`.
2. Create a branch from `main`: `<type>/<issue-number>-<slug>`. Types: `feat`, `fix`, `docs`, `chore`, `test`, `ci`.
   Set Project Status `In Progress`.
3. For UI work, use `vaultme-figma-screen` (Figma) or `vaultme-design-to-code` (app). Their completion gates are part of done.
   Before you edit an area, read `ARCHITECTURE.md`, the ADRs in `docs/adr/` that touch it, and the lessons skill
   `.claude/skills/vaultme-review-lessons/SKILL.md`.
4. Commit with Conventional Commits. The pre-commit hook runs `scripts/check-repo-rules.sh`.
   The pre-push hook also runs `pnpm turbo run typecheck lint test` when code changed.
5. Run `coderabbit review --base main --agent` locally and fix its findings before you open the PR.
   Iterate with this CLI and `/code-review`, not with repeated PR reviews (step 7).
6. Open the PR with `Closes #N`. Keep the description at 3,500 characters or less.
   Keep the PR at 100 changed files or fewer; split a larger change into several PRs.
   State what changed, which design sections it follows, and the exact verification commands and results.
   Never label a step verified without a run. Set Project Status `In Review`.
7. Request one CodeRabbit PR review: comment `@coderabbitai review` once per PR (the OSS plan reviews about
   1 PR per hour). Collect all its findings, fix them together, check the fixes with step 5, and push once.
8. Answer each finding with one of: fix the code; fix the design source in the same PR;
   add a check to `scripts/check-repo-rules.sh`; or reject it and cite the design source section.
9. Repeated finding (same kind seen in 2 PRs, or twice in one PR): add a check that fails on it
   (`scripts/check-repo-rules.sh`, a test, or a type) and list it in `AGENTS.md` "Enforced rules".
   Only if no check can detect it, add a lesson to `.claude/skills/vaultme-review-lessons/SKILL.md`.
   Do this in a separate `chore` PR if it is outside the PR purpose.
10. Merge when no Critical or Major finding is open and all checks pass. Record open Minor findings
    as new issues and link them. Squash merge. Project Status moves to `Done` when the issue closes.

## Setup once per clone

`git config core.hooksPath .githooks`
