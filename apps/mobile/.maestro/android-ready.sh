#!/usr/bin/env bash
# Waits until the Android package service answers, then installs the APK (retried). Usage: android-ready.sh <serial> <apk>
# release.yml boots the emulator with -change-locale ko-KR, which restarts the framework after the boot-complete signal; an install in that
# window failed with "Failure calling service package: Broken pipe" (dry run 43774041050). `pm path android` works only when the service is up.
set -euo pipefail
serial="${1:?serial}"
apk="${2:?apk}"
tries="${ANDROID_READY_TRIES:-30}"
for i in $(seq 1 "$tries"); do
  if [ "$(adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && adb -s "$serial" shell pm path android >/dev/null 2>&1; then
    if adb -s "$serial" install -r "$apk"; then exit 0; fi
  fi
  echo "package service not ready or install failed (try $i of $tries); waiting"
  sleep 5
done
echo "::error::could not install $apk on $serial after $tries tries" >&2
exit 1
