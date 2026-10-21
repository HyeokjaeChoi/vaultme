# Work workflow

A repository change (code, tokens, docs, CI) = one GitHub issue = one branch = one PR.
Work that changes no repository file (Figma-only edits, including small design fixes) needs no issue or PR. Link the result (frame IDs, audit result) in the related issue or PR.
Figma screen gates still apply (`docs/agents/design-system.md`).

## Steps

1. Create an issue in this repo. Add it to the GitHub Project "VaultMe". Set Status `Todo`.
   `gh issue create --title "<type>: <summary>" --body-file <file> --label <area>` then
   `gh project item-add <project-number> --owner HyeokjaeChoi --url <issue-url>`.
2. Create a branch from `main`: `<type>/<issue-number>-<slug>`. Types: `feat`, `fix`, `docs`, `chore`, `test`, `ci`.
   Set Project Status `In Progress`.
3. For UI work, use `vaultme-figma-screen` (Figma) or `vaultme-design-to-code` (app). Their completion gates are part of done.
   Before you edit an area, read the sources in `docs/agents/design-index.md` and the lessons skill
   `.claude/skills/vaultme-review-lessons/SKILL.md`.
4. Commit with Conventional Commits. The pre-commit hook runs `scripts/check-repo-rules.sh`.
   The pre-push hook also runs `pnpm turbo run typecheck lint test` when code changed.
5. Run `coderabbit review --base main --agent` locally and fix its findings before you open the PR.
6. Open the PR with `Closes #N`. Keep the description at 3,500 characters or less.
   State what changed, which design sections it follows, and the exact verification commands and results.
   Never label a step verified without a run. Set Project Status `In Review`.
7. CodeRabbit reviews the PR. Collect all findings of one round, fix them together, push once,
   then comment `@coderabbitai full review`.
8. Answer each finding with one of: fix the code; fix the design source in the same PR;
   add a check to `scripts/check-repo-rules.sh`; or reject it and cite the design source section.
9. Repeated finding (same kind seen in 2 PRs, or twice in one PR): add a lesson to
   `.claude/skills/vaultme-review-lessons/SKILL.md`. If a script can detect it, also add a check
   to `scripts/check-repo-rules.sh`. Do this in a separate `chore` PR if it is outside the PR purpose.
10. Merge when no Critical or Major finding is open and all checks pass. Record open Minor findings
    as new issues and link them. Squash merge. Project Status moves to `Done` when the issue closes.

## Setup once per clone

`git config core.hooksPath .githooks`

## Decisions without owner direction

When the owner did not specify a choice and you must decide (library, version, API, config option, platform behavior, tool, or workaround), do these steps before you act:

1. Read the current official documentation. For a library, framework, SDK, CLI, or cloud service, use ctx7 first (`npx ctx7@latest library <name> "<question>"`, then `npx ctx7@latest docs <id> "<question>"`). If ctx7 has no match, use the vendor's official docs or release notes.
2. Check the release state: the installed version, the latest stable release and its date (`npm view <pkg> time`), deprecation notices, and whether an official option replaces a custom workaround. Obey pnpm `minimumReleaseAge` (7 days).
3. Prefer the official, released solution to a custom workaround. If you must use a workaround, write the reason and the condition to remove it in a code comment.
4. In the report and the PR, name each source (URL or ctx7 library ID) and the version you checked. If you could not check, say so. Do not present an unchecked decision as verified.

These steps also apply to delegated work. Put them in the delegation instructions.
