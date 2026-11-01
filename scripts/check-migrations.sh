#!/usr/bin/env bash
# D1 migration lint (Q53, Q66, #316): a migration may not DROP COLUMN, DROP TABLE or RENAME unless the file has a line
# `-- contract-ok: <reason>` (the old Worker must still run on the new schema; ARCHITECTURE.md, Release).
# Usage: scripts/check-migrations.sh [dir]   (default apps/api/migrations)
set -euo pipefail
dir="${1:-apps/api/migrations}"
bad=0
for f in "$dir"/*.sql; do
  [ -e "$f" ] || continue
  # Read as SQL tokens: strings and comments are dropped and lines are joined, so a word in a comment or a name, or a
  # statement split over lines, is judged right. SQLite allows `DROP [COLUMN] c`, so any DROP inside ALTER TABLE counts.
  if perl -0777 -pe "s{/\\*.*?\\*/}{ }gs; s{--[^\\n]*}{ }g; s{'(?:[^']|'')*'}{''}g; s{\\s+}{ }g" "$f" |
    grep -iEq '\bRENAME\b|\bDROP +TABLE\b|\bALTER +TABLE\b[^;]* DROP\b'; then
    grep -Eq '^[[:space:]]*--[[:space:]]*contract-ok:[[:space:]]*[^[:space:]]' "$f" || { echo "$f: DROP COLUMN, DROP TABLE or RENAME needs a line '-- contract-ok: <reason>'" >&2; bad=1; }
  fi
done
exit "$bad"
