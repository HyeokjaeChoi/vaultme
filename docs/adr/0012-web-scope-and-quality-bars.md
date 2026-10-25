# 0012. Web app scope and quality bars

Status: Accepted (2026-10-25, spec issue #186, owner grilling Q1-Q13). Not implemented: `apps/web` does not exist yet.
Supersedes: the "a web app" non-goal in `ARCHITECTURE.md`. Hosting stays as in [0001](0001-web-hosting-workers-static-assets.md). API access: [0011](0011-web-client-api-access.md).

## Context
VaultMe has only a mobile app. People on the web cannot learn about it or look at a Sepolia address without installing it.

## Decision
- Scope: an SEO landing page (Korean `/`, English `/en/`), a read-only address viewer (ETH and Sepolia USDC balances, history, transaction detail, 404). Production `vaultme.stack-line.dev`; staging `vaultme-staging.stack-line.dev` (noindex).
- Not in scope: keys, recovery phrase or send in the browser; WalletConnect; ENS; fiat prices; admin dashboard; English Figma variants.
- Quality bars, enforced in CI: Lighthouse ≥ 95 in all four categories; Core Web Vitals good; landing JS ≤ 100 KB gzip; WCAG 2.2 AA (focus ring, text plus color for status, 44px targets); axe = 0 violations.
- Languages: ko and en, `hreflang`, per-locale canonical, sitemap, a header language switch, no automatic redirect.
- Viewer state is in the URL fragment (`/address#0x…`, `/tx#0x…`), so an address never reaches the server, logs or analytics.
- Analytics: Cloudflare Web Analytics only (no cookies, no consent banner).
- Fonts: self-hosted Pretendard Variable (dynamic subset) and IBM Plex Mono (Latin subset) for addresses and hashes; OFL license files shipped.
- Every page shows a "Sepolia testnet, test funds only" notice. The viewer says: read-only, no sign-in, we never ask for keys or a recovery phrase.
- Figma first: each web screen has light and dark frames at 375, 768 and 1280, bound to the design system, before implementation.

## Consequences
- A second client shares `packages/` logic (install identity, history with the address-poisoning filter) instead of copying it.
- Production launch needs a separate owner approval.
- Raising a bar's limit needs a new ADR.
