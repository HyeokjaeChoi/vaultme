#!/usr/bin/env bash
# MOB-5 Android cold start on a running emulator (docs/testing/e2e.md). Usage: coldstart-android.sh <app-release.apk>
# Installs the APK, then times `am start -W` (TotalTime) after a force-stop: 1 warm-up + COLDSTART_SAMPLES (10). The median fails at 5000 ms or more;
# with COLDSTART_BASELINE_MS set (docs/perf/mobile-baseline.env) it warns above +25 %.
set -euo pipefail
apk="${1:?usage: $0 <apk>}"
pkg=dev.stackline.vaultme
n="${COLDSTART_SAMPLES:-10}"
serial="${ANDROID_SERIAL:-emulator-5554}"
case "$serial" in emulator-*) ;; *) echo "emulator only (got $serial)" >&2; exit 2 ;; esac
adb() { command adb -s "$serial" "$@"; }
adb install -r "$apk" >/dev/null
comp="$(adb shell cmd package resolve-activity --brief -c android.intent.category.LAUNCHER "$pkg" | tr -d '\r' | tail -n 1)"
case "$comp" in "$pkg"/*) ;; *) echo "::error::no launcher activity for $pkg (got '$comp')"; exit 1 ;; esac
times=()
for i in $(seq 0 "$n"); do
  adb shell am force-stop "$pkg"
  sleep 2
  t="$(adb shell am start -W -n "$comp" | tr -d '\r' | sed -n 's/^TotalTime: *//p')"
  [ -n "$t" ] || { echo "::error::am start -W printed no TotalTime"; exit 1; }
  [ "$i" -eq 0 ] || times+=("$t") # sample 0 is the warm-up
done
adb shell am force-stop "$pkg"
median="$(printf '%s\n' "${times[@]}" | sort -n | awk '{a[NR]=$1} END {print (NR % 2) ? a[(NR+1)/2] : int((a[NR/2]+a[NR/2+1])/2)}')"
msg="MOB-5 Android cold start: median ${median} ms of ${#times[@]} (${times[*]}); fails at 5000 ms"
echo "$msg"
[ -z "${GITHUB_STEP_SUMMARY:-}" ] || echo "$msg" >> "$GITHUB_STEP_SUMMARY"
if [ -n "${COLDSTART_BASELINE_MS:-}" ] && [ "$median" -gt $((COLDSTART_BASELINE_MS * 125 / 100)) ]; then
  echo "::warning::cold start is more than 25 % over the baseline (${COLDSTART_BASELINE_MS} ms)"
fi
if [ "$median" -ge 5000 ]; then echo "::error::median cold start $median ms is 5000 ms or more"; exit 1; fi
