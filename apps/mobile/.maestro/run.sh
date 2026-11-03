#!/usr/bin/env bash
# Runs the Maestro flows on an iOS simulator, or with PLATFORM=android on an Android emulator (docs/testing/e2e.md). Usage: .maestro/run.sh smoke|full|critical|release [path/to/VaultMe.app|app-release.apk]
# smoke = flows tagged smoke (the PR gate). full = every flow (nightly). critical = flows tagged critical (release.yml dry run). release = critical + funded: the funded flows (real Sepolia sends, #381) need the MAESTRO_* env of release-run.sh. Target: SIM_UDID (default: the only booted simulator), or ANDROID_SERIAL (default emulator-5554).
# Device auth (ADR-0016): no bypass in the app. The simulator gets Face ID enrolled, and while the flows run a loop sends the
# Face ID "match" event every second; it matters only while an OS auth sheet is up (create, reveal, lock gate), else it is ignored.
# Android: the emulator gets a PIN and a fingerprint, and the loop touches finger 1 every second (scripts/sim-auth.sh match android).
set -euo pipefail
cd "$(dirname "$0")"
tags="${1:-}"
case "$tags" in smoke | full | critical | release) ;; *) echo "usage: $0 smoke|full|critical|release [VaultMe.app]" >&2; exit 2 ;; esac
export MAESTRO_CLI_NO_ANALYTICS=1
# The first driver start on a fresh CI device is slow: the XCTest driver took 2.5 min (run 1) and timed out at the default (run 2).
# Set before the Android enrollment, which is the first driver start there.
export MAESTRO_DRIVER_STARTUP_TIMEOUT=600000
# PLATFORM=android runs the same flows on an Android emulator (release.yml job android-critical, #382); default ios.
platform="${PLATFORM:-ios}"
case "$platform" in
  ios)
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
    ;;
  android)
    app="${2:-../android/app/build/outputs/apk/release/app-release.apk}"
    export ANDROID_SERIAL="${ANDROID_SERIAL:-emulator-5554}" # scripts/sim-auth.sh reads it; the emulator console needs an emulator, never a phone
    udid="$ANDROID_SERIAL"
    case "$udid" in emulator-*) ;; *) echo "PLATFORM=android runs on an emulator only (got $udid)" >&2; exit 2 ;; esac
    adb -s "$udid" install -r "$app"
    # Screen lock PIN + fingerprint for the throwaway CI emulator (same setup as apps/mobile/AGENTS.md; the PIN is a test value).
    adb -s "$udid" shell locksettings set-pin 1234
    adb -s "$udid" shell svc power stayon true
    # The touch loop starts first: enrollment asks for several touches, and later the OS auth sheets need one each.
    ( while true; do ../../../scripts/sim-auth.sh match android >/dev/null 2>&1 || true; sleep 1; done ) &
    loop=$!
    trap 'kill $loop 2>/dev/null || true' EXIT
    adb -s "$udid" shell am start -a android.settings.BIOMETRIC_ENROLL >/dev/null
    maestro --udid "$udid" test enroll-fingerprint-android.yaml --test-output-dir ../e2e-artifacts/enroll
    # The enroll flow taps optional buttons, so it can end without a fingerprint: fail here with the cause, not later in every auth flow.
    prints="$(adb -s "$udid" shell dumpsys fingerprint)"
    echo "$prints"
    grep -qE '"count":[1-9]' <<<"$prints" || { echo "::error::no fingerprint enrolled on $udid (dumpsys fingerprint above); check enroll-fingerprint-android.yaml"; exit 1; }
    adb -s "$udid" shell input keyevent KEYCODE_HOME
    ;;
esac
include=smoke
[ "$tags" = full ] && include=smoke,full
[ "$tags" = critical ] && include=critical
[ "$tags" = release ] && include=critical,funded
rm -f ../e2e-report.xml ../e2e-report-retry.xml # a report left from an earlier local run must not pick the flows to retry
maestro --udid "$udid" test flows --include-tags "$include" --format junit --output ../e2e-report.xml --test-output-dir ../e2e-artifacts && exit 0
# One retry of the failed flows only (owner decision 2026-11-03, #376): the CI simulator sometimes loses a flow to its own
# hiccups (driver unreachable, a label not found on a screen that shows it). A flow that fails twice fails the job; a pass on
# the retry is reported as flaky. A run with no report (e.g. the driver never started) fails at once.
[ -f ../e2e-report.xml ] || exit 1
retry=()
while IFS= read -r name; do
  for f in flows/*.yaml; do
    if grep -qxF "name: $name" "$f"; then retry+=("$f"); fi # an if, not &&: a non-matching last file must not end the loop with status 1 (set -e)
  done
done < <(python3 -I -c 'import sys, xml.etree.ElementTree as E
for t in E.parse(sys.argv[1]).iter("testcase"):
    if t.find("failure") is not None or t.find("error") is not None: print(t.get("name"))' ../e2e-report.xml)
[ ${#retry[@]} -gt 0 ] || exit 1
echo "::warning::flaky: retrying ${retry[*]}"
maestro --udid "$udid" test "${retry[@]}" --format junit --output ../e2e-report-retry.xml --test-output-dir ../e2e-artifacts/retry
