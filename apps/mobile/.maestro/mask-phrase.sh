#!/usr/bin/env bash
# Masks the funded wallet phrase in the job log (#381): the whole phrase and every single word, because GitHub masks exact strings only
# and Maestro prints "Input text <value>" for each typed word. A mask lasts for the rest of the job, so run this in a step of its own,
# before the step that runs Maestro (its output is tee'd to a file, and `::add-mask::` lines must not land in that file).
# Usage: E2E_RELEASE_PHRASE=... mask-phrase.sh
set -euo pipefail
raw="${E2E_RELEASE_PHRASE:?E2E_RELEASE_PHRASE is missing in the GitHub Environment release}"
phrase="$(printf '%s' "$raw" | tr -s '[:space:]' ' ' | sed 's/^ //;s/ $//')"
echo "::add-mask::$phrase"
for word in $phrase; do echo "::add-mask::$word"; done
echo "Recovery phrase and its words are masked in this job's log."
