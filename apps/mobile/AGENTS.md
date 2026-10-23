# apps/mobile

Expo app. Read `ARCHITECTURE.md` (code map) and `DESIGN.md` before you change a screen.

- Layers in `src/`, top to bottom: `shell`, `pages`, `widgets`, `features`, `entities`, `shared`. Import only from lower layers, and only through a slice's `index.ts`. Do not import between slices of the same layer. Today's code has some violations; #92 fixes them and adds a lint check.
- `app/` is the expo-router tree. A route file should only render a page from `src/pages` or `src/shell`. Some route files import more today; #92 fixes them and adds the check.
- Screen work follows the `vaultme-design-to-code` skill: Figma first, then code, then light and dark comparison images in the PR.
- Copy lives in `packages/i18n`. Use the terms in `CONTEXT.md`.
