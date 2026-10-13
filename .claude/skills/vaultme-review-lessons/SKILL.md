---
name: vaultme-review-lessons
description: Use before writing or reviewing any VaultMe code, tokens, copy or CI change. Lists review findings that came back more than once, so the same mistake is not made again.
---

# VaultMe review lessons

Read this before you edit code in this repo. Each lesson came from a repeated review finding.
When a lesson has a check, `scripts/check-repo-rules.sh` enforces it.

## How to add a lesson

Add a lesson when the same kind of finding appears in 2 PRs, or twice in one PR.
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
- Source: outputs/design/text-200-check.md

### L01. App screens use the product spacing scale
- Why: C2a used `sectionGap.mobile` (64, landing page) and screens looked broken.
- Do: `sectionGap.product` 24, `groupGap` 16, `rowGap` 12, `fieldGap` 8, screen padding 16. No numeric style literals.
- Check: `scripts/check-repo-rules.sh` R4, R5
- Source: docs/retro/2026-10-13-design-system-not-applied.md

### L02. UI is built from Figma components, and proven with a comparison
- Why: Figma screen layers had 900+ unbound values; app components were rebuilt from docs with inverted button hierarchy.
- Do: Figma via `vaultme-figma-screen` (audit = 0). Code via `vaultme-design-to-code` (`get_design_context`, `// Figma:` header, app-vs-Figma pairs).
- Check: R6 + audit.js + PR comparison images (manual review by the main agent)
- Source: docs/retro/2026-10-13-design-system-not-applied.md
