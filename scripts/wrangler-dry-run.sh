#!/usr/bin/env bash
# PROD-1: `wrangler deploy --env production --dry-run` for one app. Fails on a non-zero exit AND on a config warning:
# wrangler only warns about an unknown or misspelled field (exit 0), and that is the drift this gate exists to catch.
# Config only: the web build is not the production build. Usage: scripts/wrangler-dry-run.sh <pnpm package> <outdir>
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
log="$(mktemp)"
pnpm --filter "$1" exec wrangler deploy --env production --dry-run --outdir "$2" 2>&1 | tee "$log"
if grep -qE 'Processing .* configuration' "$log"; then
  echo "wrangler-dry-run: wrangler reported a config problem for $1 (see above)" >&2
  exit 1
fi
