# apps/mobile

Expo app. Read `ARCHITECTURE.md` (code map) and `DESIGN.md` before you change a screen.

- Layers in `src/`, top to bottom: `shell` (FSD app layer; Expo Router reserves `src/app`), `pages`, `widgets`, `features`, `entities`, `shared`. `eslint.config.mjs` (boundaries) and `steiger.config.mjs` enforce the import rules; read the message when one fails.
- `app/` is the expo-router tree. A route file only re-exports from `src/shell` or `src/pages`.
- Screen work follows the `vaultme-design-to-code` skill: Figma first, then code, then light and dark comparison images in the PR.
- Copy lives in `packages/i18n`. Use the terms in `CONTEXT.md`.
