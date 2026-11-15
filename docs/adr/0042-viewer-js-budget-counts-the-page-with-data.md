# 0042. The viewer JS budget counts the page with its data

Status: Accepted (2026-11-15, owner approval of the [quality-gates plan](../plans/quality-gates.md), decision 4, issue #482). Supersedes [0018](0018-js-budgets-count-compressed-body.md) in part: its last consequence, "a page whose JS is not loaded by the Lighthouse run ... is not measured". The limits and the way 0018 counts (gzip body, same-origin, response headers left out) still bind.

## Context
`lhci` opens `/address` and `/tx` without a fragment. The page makes no API call and loads none of the lazy chunks (`@vaultme/history`, the API client, the chain reads). So the viewer JS budget measures the shell: 153,011 of 153,600 B at plan time. A visitor with an address or a hash loads more.

Measured with the real build in Chromium (`apps/web/e2e/perf.spec.ts`, 2026-11-15, fragment in the URL, fixture API): `/address#<address>` loads 183,449 B gzip in 12 files, `/tx#<hash>` loads 181,665 B in 11 files. That is 29,849 B and 28,065 B over the limit of 153,600 B. The number the budget showed was the shell's, not the page's.

## Decision
- The viewer limit (153,600 B gzip; `/address` and `/tx`, ko and en) applies to the page with its data: all same-origin JS the page loads until its first screen with data. Counting is as in 0018.
- The shell stays measured by `lhci` and stays an error (`apps/web/scripts/js-budget.ts`). The page with data is measured by Playwright (`apps/web/e2e/perf.spec.ts`: real build, fragment, fixture API) with the same function, `gzipSize` (gzip level 9).
- Until the JS fits the limit (about 30 KB to cut), the with-data check is a warning: an annotation and a row in the job summary. When it fits, `WITH_DATA_IS_ERROR` in `apps/web/e2e/perf.spec.ts` becomes `true` and the check fails a PR.
- A page with under 2 % of its limit left warns in `apps/web/scripts/js-budget.ts` (a `warn` row and an annotation), the shell too. A warning never fails the job.

## Consequences
- The gap to the limit is in the open: about 30 KB for each viewer page. The shell numbers do not change.
- Until the cut, a PR that adds JS to the lazy chunks shows the larger number in the warning but does not fail on it. The shell check still fails, and the headroom warning still warns.
- Where to cut (which lazy chunk, which dependency) is a product change in its own issue. This ADR does not decide it.
