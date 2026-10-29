# 0017. The Web Analytics beacon is outside the JS budgets

Status: Accepted (2026-10-27, issue #254, owner decision "A로 진행"). Supersedes in part [0012](0012-web-scope-and-quality-bars.md): how the JS budgets are measured. Superseded in part by [0018](0018-js-budgets-count-compressed-body.md): the unit of the JS budgets (compressed body, not Lighthouse transfer size). The beacon decision still binds. The Analytics line of 0012 (Cloudflare Web Analytics only, no cookies, no consent banner) still binds.

## Context
Issue #198 asks for Cloudflare Web Analytics on staging. The beacon (Cloudflare beacon.min.js) is a third-party script of about 10 KB gzip. With it, the viewer pages (`/address`, `/tx`) measure about 163 KB of script in Lighthouse, above the 153,600 B limit of 0012. Lighthouse 4 × ≥ 95 passed with the beacon (measured once, PR #253).

## Decision
- The JS budgets of 0012 (static pages ≤ 100 KB, viewer ≤ 150 KB) count the app's own JS only. The limits do not change.
- The `lhci` jobs and `web` e2e run on a build without the beacon (`WEB_ANALYTICS_TOKEN` unset).
- The beacon is added only by `scripts/finalize.ts` when `WEB_ANALYTICS_TOKEN` is set and `WEB_ENV` is not `production`. `e2e/analytics.spec.ts` (staging gate) and the staging smoke test check its tag and CSP.
- Adding the beacon to production needs its own owner approval.

## Consequences
- Staging pages ship about 10 KB more script than the budget measures.
- The URL fragment is not sent by the beacon (measured, `apps/web/AGENTS.md`); re-check when the beacon version changes.
