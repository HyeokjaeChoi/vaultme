---
name: vaultme-design-to-code
description: Use for ANY VaultMe app UI code (apps/mobile, later apps/web) — new screen, component, or visual change. Implements from Figma masters with Figma MCP design-to-code, uses only @vaultme/tokens values, and blocks completion until an app-vs-Figma comparison exists for every changed screen.
---

# VaultMe design to code

The Figma file NMXrn0q75G1SX2Bn1L1jP8 is the visual source. Code never guesses a value that Figma defines.

## Hard rules

1. **Invoke `figma:figma-design-to-code` first**, then call `get_design_context` (with screenshot) on the Figma component master or screen frame before writing UI code. Component master IDs are in `.claude/skills/vaultme-figma-screen/SKILL.md`.
2. **One code component per Figma component.** Each file in `apps/mobile/src/shared/ui` starts with `// Figma: <Component name> <node id>`. Screens compose these components only. No ad-hoc styled `View` that imitates a component.
3. **Token values only.** Colors, spacing, radii, font size, line height, letter spacing come from `@vaultme/tokens`. Numeric literals in those style keys are rejected by `scripts/check-repo-rules.sh` R5 (0 is allowed).
4. **Product spacing scale.** Screen gaps use `semantic.layout.sectionGap.product`, `groupGap`, `rowGap`, `fieldGap`. `sectionGap.mobile` and `sectionGap.desktop` are banned in app code (R4).
5. **Hierarchy comes from the Figma frame**, not from guesses: which button is Primary, which is Ghost, which surface is the white card.
6. **Copy comes from `packages/i18n`**, which follows `outputs/design/ux-terminology.md`.

## Completion gate (all required)

1. `pnpm turbo run typecheck lint test` passes and `scripts/check-repo-rules.sh` passes.
2. For every changed screen: a simulator capture `work/compare/<screen>-app.png` and the Figma frame capture `work/compare/<screen>-figma.png`, light mode, plus one dark-mode pair.
3. The main agent (not the implementer) looks at each pair and lists remaining differences. Any difference in spacing scale, hierarchy, color role, or missing component blocks the PR.
4. The PR description links the pairs and states the remaining differences.
