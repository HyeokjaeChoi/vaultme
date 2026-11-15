#!/usr/bin/env bash
# Post-deploy smoke of the staging web Worker (web-staging.yml `deploy`, and its re-check after a rollback, ADR-0044).
# Needs STAGING_API_URL and WEB_ANALYTICS_TOKEN in the environment. Run from any directory: it writes scratch files to the cwd.
set -euo pipefail
url=https://vaultme-staging.stack-line.dev
# A new custom domain needs a moment for DNS and the certificate: retry the connection.
status=$(curl -sS --retry 20 --retry-all-errors --retry-delay 6 -o body.html -D headers.txt -w '%{http_code}' "$url/smoke-no-such-page")
cat headers.txt
# A missing path answers a real 404 with the page, the security headers and noindex (acceptance of #192).
[ "$status" = 404 ] || { echo "expected 404, got $status"; exit 1; }
grep -q '404' body.html
for h in content-security-policy strict-transport-security x-content-type-options referrer-policy permissions-policy; do
  grep -qi "^$h:" headers.txt || { echo "missing header $h"; exit 1; }
done
grep -qi '^x-robots-tag:.*noindex' headers.txt || { echo "missing X-Robots-Tag noindex"; exit 1; }
# Web Analytics (ADR-0012): the beacon script is in the page and the CSP allows its script and RUM endpoint.
grep -q "static.cloudflareinsights.com/beacon.min.js.*$WEB_ANALYTICS_TOKEN" body.html || { echo "404 page: no Web Analytics beacon"; exit 1; }
grep -qi '^content-security-policy:.*script-src[^;]*static.cloudflareinsights.com' headers.txt || { echo "CSP lacks static.cloudflareinsights.com"; exit 1; }
grep -qi '^content-security-policy:.*connect-src[^;]*cloudflareinsights.com' headers.txt || { echo "CSP lacks cloudflareinsights.com"; exit 1; }
# The viewer and transaction pages are prerendered shells: 200 with no redirect (curl does not follow one), the same headers,
# the app script (they hydrate) and the API origin of this build in the CSP. The balance read needs WebCrypto
# and IndexedDB, which curl does not have, so a browser checks that after the deploy (e2e uses fixtures).
for path in /address /en/address /tx /en/tx; do
  status=$(curl -sS -o page.html -D page-headers.txt -w '%{http_code}' "$url$path")
  [ "$status" = 200 ] || { echo "$path: expected 200, got $status"; cat page-headers.txt; exit 1; }
  for h in content-security-policy strict-transport-security x-content-type-options referrer-policy permissions-policy; do
    grep -qi "^$h:" page-headers.txt || { echo "$path: missing header $h"; exit 1; }
  done
  grep -qi '^x-robots-tag:.*noindex' page-headers.txt || { echo "$path: missing X-Robots-Tag noindex"; exit 1; }
  grep -qi "^content-security-policy:.*connect-src[^;]*${STAGING_API_URL}" page-headers.txt || { echo "$path: CSP connect-src lacks $STAGING_API_URL"; exit 1; }
  grep -q "src=\"https://static.cloudflareinsights.com/beacon.min.js\"[^>]*$WEB_ANALYTICS_TOKEN" page.html || { echo "$path: no Web Analytics beacon"; exit 1; }
  grep -q '__reactRouterContext' page.html || { echo "$path: not the hydrated viewer page"; exit 1; }
done
