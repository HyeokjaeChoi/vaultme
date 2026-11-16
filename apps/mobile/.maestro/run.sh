#!/usr/bin/env bash
# Runs the Maestro flows on an iOS simulator, or with PLATFORM=android on an Android emulator (docs/testing/e2e.md). Usage: .maestro/run.sh smoke|full|critical|release [path/to/VaultMe.app|app-release.apk]
# smoke = flows tagged smoke (a quick local check; no CI job runs it since ADR-0039). full = every flow (manual dispatch). critical = flows tagged critical (release.yml dry run). release = critical + funded: the funded flows (real Sepolia sends, #381) need the MAESTRO_* env of release-run.sh and are never retried (ADR-0040). Target: SIM_UDID (default: the only booted simulator), or ANDROID_SERIAL (default emulator-5554).
# Device auth (ADR-0016): no bypass in the app. The simulator gets Face ID enrolled, and while the flows run a loop sends the
# Face ID "match" event every second; it matters only while an OS auth sheet is up (create, reveal, lock gate), else it is ignored.
# Android: the emulator gets a PIN and a fingerprint, and the loop touches finger 1 every second (scripts/sim-auth.sh match android).
# `loop <flow.yaml> <n> [app]` (iOS, #668): runs one flow n times, no retry, and prints pass or fail per iteration (a diagnosis loop for one flaky flow).
set -euo pipefail
cd "$(dirname "$0")"
tags="${1:-}"
if [ "$tags" = loop ]; then
  loop_flow="${2:-}"; loop_n="${3:-}"
  # Both come from a workflow input: accept a plain file name in flows/ and a count only.
  [[ "$loop_flow" =~ ^[a-z0-9-]+\.yaml$ && -f "flows/$loop_flow" && "$loop_n" =~ ^[0-9]+$ && "$loop_n" -ge 1 && "$loop_n" -le 40 ]] || { echo "usage: $0 loop <flows/x.yaml name> <1-40> [VaultMe.app]" >&2; exit 2; }
  set -- loop ${4:+"$4"}
fi
case "$tags" in smoke | full | critical | release | loop) ;; *) echo "usage: $0 smoke|full|critical|release|loop [VaultMe.app]" >&2; exit 2 ;; esac
[ "$tags" != loop ] || [ "${PLATFORM:-ios}" = ios ] || { echo "loop runs on iOS only" >&2; exit 2; }
export MAESTRO_CLI_NO_ANALYTICS=1
# The first driver start on a fresh CI device is slow: the XCTest driver took 2.5 min (run 1) and timed out at the default (run 2).
# Set before the Android enrollment, which is the first driver start there.
export MAESTRO_DRIVER_STARTUP_TIMEOUT=600000
ios_prepare() {
  xcrun simctl install "$udid" "$app"
  # The app follows the device language (ADR-0037) and the flows match Korean text: pin this E2E simulator to Korean.
  # The global domain is read when the app starts, so the next launchApp picks it up without a reboot.
  xcrun simctl spawn "$udid" defaults write -g AppleLanguages -array ko-KR
  xcrun simctl spawn "$udid" defaults write -g AppleLocale ko_KR
  # Enroll Face ID (same commands as apps/mobile/AGENTS.md, for a simulator made for E2E).
  xcrun simctl spawn "$udid" notifyutil -s com.apple.BiometricKit.enrollmentChanged 1
  xcrun simctl spawn "$udid" notifyutil -p com.apple.BiometricKit.enrollmentChanged
  # `simctl notify_post` posts a Darwin notification on the device (xcrun simctl help notify_post); `spawn notifyutil` started a process in the
  # simulator each second. A failed send was hidden by `|| true`: manual run 43881442664 had a Face ID sheet that never matched in 39 s
  # (coreauthd started the match at 14:44:28 and logged no match), so failures and a count now go to e2e-artifacts/face-id-loop.log.
}
face_loop_start() {
  mkdir -p ../e2e-artifacts
  ( sent=0; failed=0
    while true; do
      if err=$(xcrun simctl notify_post "$udid" com.apple.BiometricKit_Sim.pearl.match 2>&1); then sent=$((sent + 1)); else failed=$((failed + 1)); echo "$(date -u +%T) send failed ($failed): $err" >> ../e2e-artifacts/face-id-loop.log; fi
      [ $(((sent + failed) % 60)) -ne 0 ] || echo "$(date -u +%T) sent $sent, failed $failed" >> ../e2e-artifacts/face-id-loop.log
      sleep 1
    done ) &
  loop=$!
}
# PLATFORM=android runs the same flows on an Android emulator (release.yml job android-critical, #382); default ios.
platform="${PLATFORM:-ios}"
case "$platform" in
  ios)
    app="${2:-../ios/build/Build/Products/Release-iphonesimulator/VaultMe.app}"
    # Every flow clears the app data of its target: with several booted simulators, ask for SIM_UDID instead of guessing.
    udid="${SIM_UDID:-$(xcrun simctl list devices booted | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}' || true)}"
    [ -n "$udid" ] || { echo "no booted simulator; boot one or set SIM_UDID" >&2; exit 2; }
    [ "$(printf '%s\n' "$udid" | wc -l)" -eq 1 ] || { echo "several simulators are booted; set SIM_UDID to one of: $udid" >&2; exit 2; }
    ios_prepare
    face_loop_start
    trap 'kill $loop 2>/dev/null || true' EXIT
    ;;
  android)
    app="${2:-../android/app/build/outputs/apk/release/app-release.apk}"
    export ANDROID_SERIAL="${ANDROID_SERIAL:-emulator-5554}" # scripts/sim-auth.sh reads it; the emulator console needs an emulator, never a phone
    udid="$ANDROID_SERIAL"
    case "$udid" in emulator-*) ;; *) echo "PLATFORM=android runs on an emulator only (got $udid)" >&2; exit 2 ;; esac
    ./android-ready.sh "$udid" "$app"
    # The flows match Korean text (ADR-0037). A per-app locale is wiped by clearState (pm clear), so the emulator itself must be
    # Korean: release.yml runs android-locale.sh before the flows. Android uses persist.sys.locale when set, else ro.product.locale.
    loc="$(adb -s "$udid" shell getprop persist.sys.locale | tr -d '\r')"
    [ -n "$loc" ] || loc="$(adb -s "$udid" shell getprop ro.product.locale | tr -d '\r')"
    case "$loc" in ko*) ;; *) echo "::error::emulator locale is '$loc', the flows need Korean: run android-locale.sh first" >&2; exit 2 ;; esac
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
if [ "$tags" = loop ]; then
  # Same flow, same simulator, no retry: one line per iteration. A failed iteration also keeps the coreauthd log of its minutes.
  pass=0; fail=0
  for i in $(seq "$loop_n"); do
    if [ "$i" -gt 1 ]; then
      # A real run starts on a freshly booted simulator (iteration 1 does; 14 repeats on one simulator never failed, run 43937596396), so every
      # later iteration erases and boots it again and enrolls Face ID again.
      kill "$loop" 2>/dev/null || true
      xcrun simctl shutdown "$udid"; xcrun simctl erase "$udid"; xcrun simctl boot "$udid"; xcrun simctl bootstatus "$udid" -b >/dev/null
      ios_prepare
      face_loop_start
    fi
    echo "$(date -u +%T) loop iteration $i" >> ../e2e-artifacts/face-id-loop.log
    started=$(date -u +'%Y-%m-%d %H:%M:%S')
    if maestro --udid "$udid" test "flows/$loop_flow" --format junit --output "../e2e-report-loop-$i.xml" --test-output-dir "../e2e-artifacts/loop-$i"; then
      pass=$((pass + 1)); echo "LOOP $i/$loop_n PASS ($(date -u +%T))" | tee -a ../e2e-artifacts/loop-summary.txt
    else
      fail=$((fail + 1)); echo "LOOP $i/$loop_n FAIL ($(date -u +%T))" | tee -a ../e2e-artifacts/loop-summary.txt
      xcrun simctl spawn "$udid" log show --start "$started" --style compact --predicate 'process == "coreauthd"' 2>&1 | tail -n 300 > "../e2e-artifacts/loop-$i/coreauthd.log" || true
    fi
  done
  echo "LOOP RESULT $loop_flow: $pass pass, $fail fail of $loop_n" | tee -a ../e2e-artifacts/loop-summary.txt
  [ "$fail" -eq 0 ]
  exit
fi
include=smoke
[ "$tags" = full ] && include=smoke,full
[ "$tags" = critical ] && include=critical
[ "$tags" = release ] && include=critical,funded
rm -f ../e2e-report.xml ../e2e-report-retry.xml # a report left from an earlier local run must not pick the flows to retry
maestro --udid "$udid" test flows --include-tags "$include" --format junit --output ../e2e-report.xml --test-output-dir ../e2e-artifacts && exit 0
# One retry of the failed flows only (owner decision 2026-11-03, #376): the CI simulator sometimes loses a flow to its own
# hiccups (driver unreachable, a label not found on a screen that shows it). A flow that fails twice fails the job; a pass on
# the retry is reported as flaky. A run with no report (e.g. the driver never started) fails at once.
# Never a funded flow (ADR-0040): it broadcasts real sends, so a retry would send again. A failed funded flow fails the job at
# once; the fix is merged and the release is tagged again.
[ -f ../e2e-report.xml ] || exit 1
retry=()
funded=()
unknown=0
while read -r kind f; do
  case "$kind" in retry) retry+=("$f") ;; funded) funded+=("$f") ;; unknown) unknown=1; echo "::error::failed flow without a file in flows/: $f" ;; esac
done < <(./retry-flows.sh ../e2e-report.xml)
if [ ${#funded[@]} -gt 0 ]; then
  echo "::error::funded flow failed and is never retried (a retry would broadcast again): ${funded[*]}. Check the chain (scripts/release-verify.mts), fix, then tag again."
  exit 1
fi
[ $unknown -eq 0 ] || exit 1
[ ${#retry[@]} -gt 0 ] || exit 1
echo "::warning::flaky: retrying ${retry[*]}"
maestro --udid "$udid" test "${retry[@]}" --format junit --output ../e2e-report-retry.xml --test-output-dir ../e2e-artifacts/retry
