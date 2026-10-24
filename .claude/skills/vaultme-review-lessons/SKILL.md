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
