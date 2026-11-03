#!/usr/bin/env bash
# The release run of the Maestro flows (#381, ADR-0032): critical + funded flows, with the funded wallet phrase kept out of every log.
# Usage: E2E_RELEASE_PHRASE=... release-run.sh a|b   (a|b = the wallet that sends on this platform: a on iOS, b on Android; see scripts/release-wallets.mts)
# Run it in a step that has the secret in its env, after a step that ran mask-phrase.sh (it derives the addresses, then runs `run.sh release`).
set -euo pipefail
sender="${1:?usage: $0 a|b}"
root="$(cd "$(dirname "$0")/../../.." && pwd)"
phrase="$(printf '%s' "${E2E_RELEASE_PHRASE:?E2E_RELEASE_PHRASE is missing}" | tr -s '[:space:]' ' ' | sed 's/^ //;s/ $//')"
# Public values only (addresses, passphrase B): the TS script never prints the phrase.
while IFS= read -r line; do export "$line"; done < <(cd "$root" && pnpm exec tsx scripts/release-wallet-env.mts "$sender")
export MAESTRO_PHRASE="$phrase"
unset E2E_RELEASE_PHRASE
# Unique amounts per run, so a deposit row of an earlier run cannot satisfy the receive check: ETH 0.000NNN (NNN 100-999), USDC 0.NN (NN 01-98).
n=$(( ${GITHUB_RUN_NUMBER:-1} * 3 + ${GITHUB_RUN_ATTEMPT:-1} ))
export MAESTRO_ETH_SUFFIX=$(( 100 + n % 900 ))
MAESTRO_USDC_SUFFIX="$(printf '%02d' $(( 1 + n % 98 )))"
export MAESTRO_USDC_SUFFIX
"$(dirname "$0")/run.sh" release
