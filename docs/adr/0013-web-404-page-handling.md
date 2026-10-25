# 0013. The web app answers unknown paths with a real 404

Status: Accepted (2026-10-25, issue #192). Amends [0001](0001-web-hosting-workers-static-assets.md) (`not_found_handling`).

## Context
ADR-0001 chose `not_found_handling: "single-page-application"` so `/admin/*` could be a client-only route. In that mode every unknown path gets `index.html` with status 200, so no page can be a real 404 (Cloudflare docs: "serves /index.html with a 200 OK"). ADR-0012 puts a 404 page in scope, and issue #192 requires a real 404 status. The `/admin` dashboard is a non-goal in ADR-0012, and the viewer keeps its state in the URL fragment (`/address#0x...`), so every web page is a prerendered file.

## Decision
- `wrangler.jsonc` sets `assets.not_found_handling: "404-page"`: an unknown path gets the nearest `404.html` with status 404 (`/en/...` gets the 404.html under en).
- React Router prerenders `/404` and `/en/404`; `scripts/finalize.ts` renames them to two files named 404.html (root and under en), and drops the SPA shell `index.html` (until the landing page exists, `/` is a 404 too).
- `public/_redirects` sends `/404` and `/en/404` to the home pages, so the real files never answer 200 (a soft 404).
- The 404 page is `noindex`.
- The `/admin` rewrite of ADR-0001 is not built. If an SPA-only path returns, add a `_redirects` rewrite for it (200) and check it together with `404-page`.

## Evidence
`wrangler dev` 4.151.1 with the built site: `/`, `/foo`, `/en/zzz`, `/assets/none.js` answer 404 with the page body and all `_headers`; `/404` answers 302 to `/`. Playwright specs in `apps/web/e2e/not-found.spec.ts` check this on every PR.

## Consequences
- A missing asset is now a 404 (ADR-0001 cost 1 is gone).
- Not verified on a real account: the same behavior on `workers.dev` (checked by the `web-staging` smoke test after the first deploy).
