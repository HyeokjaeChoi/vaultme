# packages/tokens

`tokens.json` (Tokens Studio format) is the only source of token values. Do not edit `src/generated/`.

- A token change starts in Figma Variables (owner-approved), then `tokens.json`.
- After a change: `pnpm --filter @vaultme/tokens build`, then `node packages/tokens/design-md.mjs --write` so `DESIGN.md` front matter matches. Tests fail if you skip the second step.
- Add a raw value to Primitive only. Semantic and Component alias it.
- The build also writes `src/generated/tokens.css` (CSS variables, light/dark) and `theme.css` (Tailwind v4 `@theme`, defaults cleared). Web apps import both: `@import "tailwindcss"; @import "@vaultme/tokens/theme.css"; @import "@vaultme/tokens/tokens.css";`. Primitive colors are not mapped on purpose: use Semantic so dark mode works.
