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

### L05. A test or gate must fail when what it measures is absent
- Why: tests and gates passed while they measured nothing: a property that passed when every call was refused, a link crawl that read no data links, an amount regex that matched any digit, an empty API answer read as no breach, a completeness test that counted 30 of 32 cells, a known-bug case that asserted the bug in its setup.
- Do: assert the exact expected outcome, not only that no wrong one occurred. Wait for the real content before you read it, and require a minimum count of matched items or runs. Match the value with its unit or label. Treat an empty input as an error. Prove each new test red once: break the code (a mutation) and see it fail.
- Check: manual
- Source: [#556](https://github.com/HyeokjaeChoi/vaultme/pull/556), [#576](https://github.com/HyeokjaeChoi/vaultme/pull/576), [#577](https://github.com/HyeokjaeChoi/vaultme/pull/577), [#579](https://github.com/HyeokjaeChoi/vaultme/pull/579), [#525](https://github.com/HyeokjaeChoi/vaultme/pull/525), [#489](https://github.com/HyeokjaeChoi/vaultme/pull/489), [#295](https://github.com/HyeokjaeChoi/vaultme/pull/295)

### L06. When behavior changes, update the docs and comments that describe it in the same PR
- Why: docs and comments described behavior the code did not have: a daily budget that was only planned, a secret paragraph that no longer matched the workflow, an ADR sentence about one concurrency group, a deploy described as curl smoke only, comments that said no caller yet.
- Do: before you open the PR, search ARCHITECTURE.md, the ADRs, `docs/` and the code comments for the names you changed, and update each statement. Write planned behavior as planned, with its issue. A change to an accepted ADR goes in a new ADR (Judgment rule 7).
- Check: manual (R11 checks only that paths resolve)
- Source: [#506](https://github.com/HyeokjaeChoi/vaultme/pull/506), [#527](https://github.com/HyeokjaeChoi/vaultme/pull/527), [#548](https://github.com/HyeokjaeChoi/vaultme/pull/548), [#577](https://github.com/HyeokjaeChoi/vaultme/pull/577), [#589](https://github.com/HyeokjaeChoi/vaultme/pull/589)

### L07. A helper failure is never read as the main outcome
- Why: a crash of a scan (exit 1) was read as a key leak, a crash of the SLO window was read as a breach, a failed evidence step rolled back a good deploy, and a failed version lookup stopped the deploy before it started.
- Do: give each outcome its own exit code, not 1 (a breach exits 3, as in `packages/perf/src/ci-health.ts`); a crash stays a red step. A helper step (evidence, upload, lookup) must not trigger a rollback or block the main step: make it tolerate an empty answer, or run it after the decision.
- Check: manual
- Source: [#545](https://github.com/HyeokjaeChoi/vaultme/pull/545), [#577](https://github.com/HyeokjaeChoi/vaultme/pull/577), [#559](https://github.com/HyeokjaeChoi/vaultme/pull/559), [#414](https://github.com/HyeokjaeChoi/vaultme/pull/414)

### L08. A secret matcher normalizes the text before it compares
- Why: the key scan read raw JSON text and missed a key split by an escaped line break; the phrase scrubber missed phrases split by newlines or written with capital letters.
- Do: decode the text first (JSON strings, escapes), then drop separators and fold case before you match. Test split, encoded and capitalized forms through the real entry point, not only through the inner helper. Use only the public test vectors.
- Check: manual (the two matchers have tests: `scripts/review-output.py` and `packages/contracts/src/scrub.ts`)
- Source: [#545](https://github.com/HyeokjaeChoi/vaultme/pull/545), [#338](https://github.com/HyeokjaeChoi/vaultme/pull/338)

### L09. Cite a measured number only after its evidence file is committed
- Why: rows and PRs cited evidence that was not in docs/results yet: a folder path that did not exist, mutation scores with no MUT-1 file, "1,000 runs, 0 counterexamples" with no CHAIN-5 file, and `Closes #572` on a PR with no evidence file.
- Do: commit the evidence file (ADR-0043, `evidence collect`) in the same PR, or write the number as planned and link the issue that adds the file. Use `Refs #N`, not `Closes #N`, until the file is in.
- Check: `scripts/check-repo-rules.sh` R20 for docs/results folder paths; manual for numbers in prose and for issue links
- Source: [#577](https://github.com/HyeokjaeChoi/vaultme/pull/577), [#588](https://github.com/HyeokjaeChoi/vaultme/pull/588), [#556](https://github.com/HyeokjaeChoi/vaultme/pull/556), [#639](https://github.com/HyeokjaeChoi/vaultme/pull/639)
