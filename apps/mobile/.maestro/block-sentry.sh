#!/usr/bin/env bash
# CI only (#460): points the Sentry ingest host at 0.0.0.0 on the macOS runner, so the iOS simulator (it uses the host's resolver) sends nothing.
# Without it every e2e run reported the slow runner simulator as App Hang issues; no Sentry event ever came from a real device.
# The app build is unchanged (no test flag in the app): only the runner network changes.
set -euo pipefail
cd "$(dirname "$0")/.."
host=$(jq -r '.expo.extra.sentryDsn' app.json | sed -E 's#^https://[^@]+@([^/]+)/.*$#\1#')
case "$host" in *.sentry.io) ;; *) echo "::error::no Sentry host in app.json extra.sentryDsn" >&2; exit 1 ;; esac
# Both families: a hosts entry for one family does not stop the other (AAAA would still resolve).
printf '0.0.0.0 %s\n:: %s\n' "$host" "$host" | sudo tee -a /etc/hosts >/dev/null
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder || true
echo "Sentry ingest blocked on this runner: $host"
