#!/usr/bin/env bash
# Android release APK gates that need no emulator (docs/testing/e2e.md). Usage: android-static-gates.sh <app-release.apk>
# MOB-4 install size: fails above 150 MiB; with APK_BASELINE_BYTES set (docs/perf/mobile-baseline.env) warns above +10 %. +25 % fails only after 2 releases: not coded yet.
# MOB-9 store rules: targetSdk >= 36 (aapt2 badging) and `zipalign -c -P 16` (16 KB page alignment) exit 0.
set -euo pipefail
apk="${1:?usage: $0 <apk>}"
sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
tools="$(ls -d "$sdk"/build-tools/* 2>/dev/null | sort -V | tail -n 1 || true)"
[ -n "$tools" ] || { echo "::error::no Android build-tools under ANDROID_HOME ('$sdk')"; exit 2; }
summary() { echo "$1"; [ -z "${GITHUB_STEP_SUMMARY:-}" ] || echo "$1" >> "$GITHUB_STEP_SUMMARY"; }
fail=0

bytes="$(wc -c < "$apk" | tr -d ' ')"
limit=$((150 * 1024 * 1024))
summary "MOB-4 APK size: $bytes B (limit $limit B, build-tools ${tools##*/})"
if [ "$bytes" -gt "$limit" ]; then echo "::error::APK is $bytes B, over the 150 MiB limit"; fail=1; fi
if [ -n "${APK_BASELINE_BYTES:-}" ] && [ "$bytes" -gt $((APK_BASELINE_BYTES * 110 / 100)) ]; then
  echo "::warning::APK grew more than 10 % over the baseline ($APK_BASELINE_BYTES B)"
fi

target="$("$tools/aapt2" dump badging "$apk" | sed -n "s/.*targetSdkVersion:'\([0-9]*\)'.*/\1/p" | head -n 1)"
summary "MOB-9 targetSdkVersion: ${target:-unknown} (needs >= 36)"
if [ -z "$target" ] || [ "$target" -lt 36 ]; then echo "::error::targetSdkVersion is '${target:-unknown}', the store needs 36 or more"; fail=1; fi

if "$tools/zipalign" -c -P 16 -v 4 "$apk" > "${TMPDIR:-/tmp}/zipalign.log" 2>&1; then
  summary "MOB-9 zipalign -P 16: aligned"
else
  tail -n 5 "${TMPDIR:-/tmp}/zipalign.log"
  echo "::error::zipalign -c -P 16 failed: native libraries are not 16 KB aligned (or this build-tools has no -P)"
  fail=1
fi
exit "$fail"
