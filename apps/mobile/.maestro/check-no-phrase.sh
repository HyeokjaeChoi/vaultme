#!/usr/bin/env bash
# Fails when a word of the funded wallet phrase is in one of the given files (the E2E report that will be uploaded). Prints the file, never the word.
# Usage: E2E_RELEASE_PHRASE=... check-no-phrase.sh file-or-dir...   (a missing path is fine: nothing to upload there)
set -euo pipefail
phrase="$(printf '%s' "${E2E_RELEASE_PHRASE:?E2E_RELEASE_PHRASE is missing}" | tr -s '[:space:]' ' ')"
bad=0
for path in "$@"; do
  [ -e "$path" ] || continue
  for word in $phrase; do
    if grep -rqwiF -e "$word" -- "$path"; then
      echo "::error::a word of the recovery phrase is in $path; it is not uploaded"
      bad=1
      break
    fi
  done
done
exit $bad
