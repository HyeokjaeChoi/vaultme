# apps/web

React Router v8 framework mode, `ssr: false`, prerendered, served by Workers Static Assets (ADR-0001, ADR-0013). Read `ARCHITECTURE.md`, ADR-0011, ADR-0012 and `DESIGN.md` before you change a screen.

- UI uses Tailwind utilities from `@vaultme/tokens` only (`theme.css`, `tokens.css`). No arbitrary values, raw colors or numeric styles (`scripts/check-repo-rules.sh` R2, R5, ESLint). A Figma size with no token goes in `app/app.css` as a `@utility` built from token values, with a removal note.
- Each file in `app/shared/ui` starts with `// Figma: <component> <node id>` (R6). Screens are route files in `app/routes`; copy comes from `@vaultme/i18n/web` (ko and en).
- A page ships no app JS unless its route sets `handle = { hydrate: true }` (`app/root.tsx`). The inline theme script (`app/shared/lib/theme.ts`) is the only script on static pages, and `scripts/finalize.ts` puts its sha256 in the CSP. Change the script and the hash follows at build time.
- Unknown paths answer a real 404 (ADR-0013). Do not add a SPA fallback.
- Gates: `pnpm --filter @vaultme/web test` (Vitest), `test:e2e` (Playwright + axe, needs `pnpm --filter @vaultme/web build`), `lhci` (Lighthouse CI, needs Chrome). Budgets live in `lighthouserc.desktop.json` and `lighthouserc.mobile.json`.
- UI work follows the `vaultme-design-to-code` skill: light and dark comparison images at 375, 768 and 1280 in the PR.
