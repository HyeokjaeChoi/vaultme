---
name: vaultme-review-lessons
description: Use before writing or reviewing any VaultMe code, tokens, copy or CI change. Lists review findings that came back more than once, so the same mistake is not made again.
---

# VaultMe review lessons

Read this before you edit code in this repo. Each lesson came from a repeated review finding.
When a lesson has a check, `scripts/check-repo-rules.sh` enforces it.

## How to add a lesson

When the same kind of finding appears in 2 PRs, or twice in one PR, first add a check that fails on it
(`scripts/check-repo-rules.sh`, a test, or a type) and list it in `AGENTS.md` "Enforced rules".
Add a lesson here only when no check can detect it (judgment calls).
Use this format. Keep it short. Link the PRs.

```
### L<NN>. <rule in one line>
- Why: <what went wrong>
- Do: <the correct pattern>
- Check: <script check name, or "manual">
- Source: <PR links>
```

## Lessons

### L00. Seed rules from design work (before the first PR)
- Why: the 200% text check and Figma review found these issues before code existed.
- Do: amounts and addresses wrap, never truncate. Bottom sheets cap at 90% height with pinned actions.
  Button labels may wrap to 2 lines. Never put a real recovery phrase or key in code, tests or logs.
- Check: manual
- Source: removed 200% text check of 2026-10-13 (see git history)

### L01. App screens use the product spacing scale
- Why: C2a used `sectionGap.mobile` (64, landing page) and screens looked broken.
- Do: `sectionGap.product` 24, `groupGap` 16, `rowGap` 12, `fieldGap` 8, screen padding 16. No numeric style literals.
- Check: `scripts/check-repo-rules.sh` R4, R5
- Source: removed retro of 2026-10-13 (see git history)

### L02. UI is built from Figma components, and proven with a comparison
- Why: Figma screen layers had 900+ unbound values; app components were rebuilt from docs with inverted button hierarchy.
- Do: Figma via `vaultme-figma-screen` (audit = 0). Code via `vaultme-design-to-code` (`get_design_context`, `// Figma:` header, app-vs-Figma pairs).
- Check: R6 + audit.js + PR comparison images (manual review by the main agent)
- Source: removed retro of 2026-10-13 (see git history)

### L03. Every visible paint is bound, and its stored color matches the variable
- Why: final product review (2026-10-17) found `#000000` text and icons (S90 Face ID status, S40 received amount, S20a meta, S10 account icon). The paints were bound, but kept the `{0,0,0}` seed color; the desktop export drew the seed. audit.js checked only non-instance nodes, so it passed.
- Do: seed a bound paint with the resolved value (`fillR` in `work/figma-local-plugin/tasks/final-fixes.js`), and run its repaint pass after text tasks. After INSTANCE_SWAP, rebind the icon color (Foundation 13).
- Check: `.claude/skills/vaultme-figma-screen/audit.js` `unboundPaint` = 0 and `stalePaint` = 0 on all five flow pages; then check PNG pixels of the exported screens.
- Source: work/review/pd-review-final-2026-10-17.md P0-1, P1-2

### L04. An OS auth sheet is not "the user left"
- Why: iOS makes the app `inactive` while the Face ID sheet is up, and the auth promise can resolve before `active` comes back. Code that dropped the result on `!== 'active'` hid the phrase after a successful Face ID on a real iPhone (#260); an earlier S03 fix had already hit the same trap. The Android device-credential screen sends the app to `background` during auth.
- Do: cancel on a real leave only: `background` while no OS auth is in progress (`isAuthInProgress()`), or screen blur. Never on `inactive`, and never on `AppState.currentState` read right after an auth call. See `leavesReveal` in `features/backup/model/reveal.ts`.
- Check: manual (unit test `backup-reveal.test.ts` covers the S03 rule; confirm on a real iPhone, the simulator resolves in another order)
- Source: #260, #28

### L05. A report or evidence step never stops the job's main action
- Why: an evidence step before the breach-issue step could stop the issue (#586). A failed evidence step started a rollback of a good deploy (#577). A warn-only step failed under `bash -e` when `gh run list` failed (#634). A `jq` lookup on an empty list failed the deploy under `pipefail` (#559).
- Do: put report and evidence steps after the main action (issue, rollback, deploy), or give them `continue-on-error: true`. In a warn-only step, end each command that can fail with `|| <fallback>`. Think through the empty answer and the error answer of each lookup.
- Check: manual (where a step may fail depends on what its job must still do)
- Source: #586, #577, #634, #559

### L06. A test must fail when the claim it proves breaks
- Why: tests passed with the behavior broken: a regex that matched any digit on the page (#577), a crawl that ran before the links rendered (#576), a property that passed when every call was refused (#556), hole tests that rewrote the property instead of running the real one (#536), a completeness test that counted 30 of 32 cells (#525), an `it.fails` case that failed in setup (#489).
- Do: break the code on purpose (swap the branch, remove the guard), see the test go red, then restore it. Assert the exact value, wait for the final state, and assert that the checked set is not empty.
- Check: manual (Stryker covers only wallet-core and history)
- Source: #577, #576, #556, #536, #525, #489

### L07. Change the docs and comments with the code
- Why: comments and docs kept the old behavior after a change: the mutation workflow header (#588), `docs/testing/e2e.md` (#527), the e2e workflow header and docs (#472), ARCHITECTURE.md and ADRs on the RPC fallback (#405).
- Do: before you push, search the repo for the old value, name or rule you changed (comments, Markdown, ADRs, AGENTS.md rows). Update each hit in the same PR.
- Check: manual (R11 checks only that paths resolve)
- Source: #588, #527, #472, #405
