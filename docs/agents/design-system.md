# Design system enforcement (hard rules)

Moved from `AGENTS.md` (#83). Rule numbers are unchanged.

These rules exist because of `docs/retro/2026-10-13-design-system-not-applied.md`. They are completion conditions, not advice.

1. Figma screens, wireframes and prototype frames are built only with `.claude/skills/vaultme-figma-screen`. UI parts are design-system instances. Layout numbers, colors and text bind to variables and styles. The skill's `audit.js` must return 0 for every count before the work is reported done.
2. App UI code is written only with `.claude/skills/vaultme-design-to-code`. Invoke `figma:figma-design-to-code` and read the Figma master or frame with `get_design_context` before writing UI code. Never rebuild a component from documentation alone.
3. App code uses `@vaultme/tokens` for every color, spacing, radius and type value. Screens use the product scale (24/16/12/8, screen padding 16). `sectionGap.mobile` and `sectionGap.desktop` are landing-page values and are banned in app code. `scripts/check-repo-rules.sh` enforces this.
4. A UI change is not done without an app-vs-Figma comparison image pair for each changed screen (light, plus one dark). The main agent reviews the pairs itself. Passing typecheck, lint and tests does not prove a UI change. Matching Figma does not prove quality: a changed screen group also needs a separate product-quality review (a reviewer agent in a Staff Product Designer role, with impeccable critique/audit and production references) before it is reported done.
5. When delegating UI work, the instructions must name the Figma node IDs, require these skills, and require the comparison pairs. "Figma screenshot optional" is not allowed.
6. Figma is the single source of truth (SSOT) for app screens. The app implements only the screens, states, components and copy that exist in Figma. If the app and Figma differ, change the app to match Figma. If the app needs a change, update the Figma frame first (owner-approved), then the app.
7. Do not build a screen, state or feature that has no Figma frame. When such a request arrives, start with a design and feature grilling session with the owner: question the goal, scope, states, edge cases, copy and safety. Then draw the Figma frames, get owner approval, and only then write code.
