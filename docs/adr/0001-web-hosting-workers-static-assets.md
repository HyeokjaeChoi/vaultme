# 0001. Host apps/web on Workers Static Assets

Status: Accepted (2026-10-14, issue #36). Implemented in `apps/web` (issue #192). The 404 handling is amended by [0013](0013-web-404-page-handling.md).
Supersedes/Aliases: Q45 and Q52 (Cloudflare Pages deploy)

## Context

Q45 chose a static deploy of `apps/web` on Cloudflare Pages. The Cloudflare Workers Best Practices recommend Workers instead of Pages for new projects. The owner decided on 2026-10-14 to move to Workers.

The docs warn: "the Cloudflare Vite plugin does not support SPA mode and prerender". So a local spike first checked that the setup works. The spike did not log in to a real account and did not deploy.

## Decision

- Host `apps/web` as its own Worker with Static Assets. There is no Worker code (no `main`).
- Build with plain `react-router build`. Do not use the Cloudflare Vite plugin.
- `wrangler.jsonc` sets `assets.directory: ./build/client` and `not_found_handling: "single-page-application"`.
- `public/_redirects` rewrites `/admin` and `/admin/*` to `/__spa-fallback 200` (see finding 1 below).
- `public/_headers` adds the security headers.
- Keep Web and API as separate Workers. This separates the security boundary and the deploy coupling.
- Register both `/admin` and `/admin/*` in Cloudflare Access.
- CI: PR previews are off for now (no narrow-scope token yet; see `apps/web/AGENTS.md`). When they return, they use Workers Builds or `wrangler versions upload --preview-alias pr-<number>`. Staging uses `wrangler deploy --env staging`. Release is a single 100% version with `wrangler deploy`, and `wrangler rollback`. Web does not use gradual deployment. During a gradual rollout the HTML and the hashed asset requests can go to different versions, so an asset of the new HTML can be missing, and the SPA fallback hides that error as a 200 HTML. To use it, first apply version affinity (`Cloudflare-Workers-Version-Key`).

## Spike evidence

Environment: macOS, local Node, a separate scratch folder. Versions: react-router and @react-router/dev 8.4.0, vite 8.3.4, wrangler 4.151.0, @cloudflare/vite-plugin 1.64.0. The app used `ssr: false`, `prerender: ["/"]`, one landing route and one `admin/*` client route.

`react-router build` put `index.html` (the prerendered `/`), `__spa-fallback.html`, `_headers`, `_redirects` and `assets/` in `build/client`.

| Check | Result |
|---|---|
| `/` has the landing text in the HTML | Pass (curl found `LANDING_PRERENDERED_TEXT`) |
| `/admin`, `/admin/foo`, `/admin/a/b` return the SPA with 200 | Pass (after the rewrite) |
| Admin renders in a browser, no console error | Pass (after the rewrite) |
| `_headers` applied | Pass (`x-spike-header: ok` and `x-content-type-options: nosniff` on `/` and on rewrite responses) |
| Missing asset (`/x.png`, `/assets/none.js`) | 200 + `text/html` (SPA fallback). Not a 404 |
| Cloudflare Vite plugin + prerender | Fail (see below) |

### Finding 1: the default SPA fallback returns the landing HTML

With only `not_found_handling: "single-page-application"`, `/admin/foo` gets `index.html`, which is the prerendered landing. The status is 200. The browser hydrates the landing HTML on the admin URL and raises React error #418 (hydration mismatch). It recovers with a client render and draws admin. The screen is right, but there is an error and a flicker.

On prerender, React Router also builds an SPA-only shell as `__spa-fallback.html`. Linking the admin paths to that file with `_redirects` fixes it.

```text
/admin /__spa-fallback 200
/admin/* /__spa-fallback 200
```

Linking to `/__spa-fallback.html` gives a 307 to `/__spa-fallback` because of `html_handling`. Write the path without an extension to get a rewrite (200).

```text
$ curl -sI :8799/admin/foo   # after the rewrite
HTTP/1.1 200 OK    (body: HydrateFallback shell)
```

### Finding 2: the Vite plugin path is blocked, as the docs say

The build used `cloudflare({ viteEnvironment: { name: "ssr" } })` together with `reactRouter()`, `ssr: false` and `prerender: ["/"]`.

```text
Error: Prerender paths missing
  at invariant (@react-router/dev/dist/routes-*.js)
  at requests (@react-router/dev/dist/vite.js)
The following error is a bug in React Router; please open an issue!
```

The docs note "SPA mode and prerendering are not supported" is correct. Do not use this path.

## Consequences

- Gain: one platform (Workers) instead of Pages. Preview, staging and rollback tools are the same as for the API. The HTML is static, so the SEO need (Q45) is still met.
- Cost 1: the SPA fallback also answers a missing asset with a 200 HTML. A broken asset link does not show as a 404. If needed, review a 404 rule for `/assets/*` later.
- Cost 2: the admin path list in `_redirects` must match the routes. If a new SPA-only path appears outside `/admin`, add it too.
- Cost 3: the Vite plugin path is not usable, so there is no Cloudflare-specific dev environment. Check locally with `react-router build`, then `wrangler dev`.
- Not verified: Workers Builds, `--preview-alias`, `wrangler rollback` and the Access policy on a real account. They need owner sign-in, so they were not run. Check them at the first deploy.

## Sources

- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/static-assets/routing/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/
- https://developers.cloudflare.com/workers/vite-plugin/
- https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/
- https://reactrouter.com/how-to/spa
