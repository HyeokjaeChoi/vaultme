#!/usr/bin/env bash
# Runs the Maestro flows on an iOS simulator (docs/testing/e2e.md). Usage: .maestro/run.sh smoke|full [path/to/VaultMe.app]
# smoke = flows tagged smoke (the PR gate). full = every flow (nightly). Target: SIM_UDID (default: the only booted simulator).
# Device auth (ADR-0016): no bypass in the app. The simulator gets Face ID enrolled, and while the flows run a loop sends the
# Face ID "match" event every second; it matters only while an OS auth sheet is up (create, reveal, lock gate), else it is ignored.
set -euo pipefail
cd "$(dirname "$0")"
tags="${1:-}"
case "$tags" in smoke | full) ;; *) echo "usage: $0 smoke|full [VaultMe.app]" >&2; exit 2 ;; esac
app="${2:-../ios/build/Build/Products/Release-iphonesimulator/VaultMe.app}"
# Every flow clears the app data of its target: with several booted simulators, ask for SIM_UDID instead of guessing.
udid="${SIM_UDID:-$(xcrun simctl list devices booted | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}' || true)}"
[ -n "$udid" ] || { echo "no booted simulator; boot one or set SIM_UDID" >&2; exit 2; }
[ "$(printf '%s\n' "$udid" | wc -l)" -eq 1 ] || { echo "several simulators are booted; set SIM_UDID to one of: $udid" >&2; exit 2; }
xcrun simctl install "$udid" "$app"
# Enroll Face ID (same commands as apps/mobile/AGENTS.md, for a simulator made for E2E).
xcrun simctl spawn "$udid" notifyutil -s com.apple.BiometricKit.enrollmentChanged 1
xcrun simctl spawn "$udid" notifyutil -p com.apple.BiometricKit.enrollmentChanged
( while true; do xcrun simctl spawn "$udid" notifyutil -p com.apple.BiometricKit_Sim.pearl.match >/dev/null 2>&1 || true; sleep 1; done ) &
loop=$!
trap 'kill $loop 2>/dev/null || true' EXIT
include=smoke
[ "$tags" = full ] && include=smoke,full
export MAESTRO_CLI_NO_ANALYTICS=1
# The first start of the XCTest driver on a fresh CI simulator took 2.5 min (run 1) and timed out at the default (run 2).
export MAESTRO_DRIVER_STARTUP_TIMEOUT=600000
maestro --udid "$udid" test flows --include-tags "$include" --format junit --output ../e2e-report.xml --test-output-dir ../e2e-artifacts
