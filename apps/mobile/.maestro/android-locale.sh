#!/usr/bin/env bash
# Sets the emulator locale to ko-KR after the boot and waits until the framework is back. Usage: android-locale.sh <serial>
# The flows match Korean text (ADR-0037). The emulator option `-change-locale ko-KR` restarts the framework right after boot-complete, while
# android-emulator-runner sends `input keyevent 82`: that failed with "Broken pipe" and failed the job (dry runs 43728396216, 43784174970).
# Here the restart happens in our own step, so we wait for it. google_apis images allow `adb root`.
# The zygote restart brings the lock screen back, so the end sends the same `input keyevent 82` (menu: dismiss) as the action did.
# Workaround: remove it when `-change-locale` no longer races with the action's unlock step, or when the flows run in English.
set -euo pipefail
serial="${1:?serial}"
tries="${ANDROID_LOCALE_TRIES:-60}"
adb -s "$serial" root || { echo "::error::adb root failed: this needs a google_apis image, not google_apis_playstore" >&2; exit 1; }
adb -s "$serial" wait-for-device
adb -s "$serial" shell setprop persist.sys.locale ko-KR
adb -s "$serial" shell setprop sys.boot_completed 0
adb -s "$serial" shell setprop ctl.restart zygote
for i in $(seq 1 "$tries"); do
  sleep 2
  if [ "$(adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; then
    loc="$(adb -s "$serial" shell getprop persist.sys.locale | tr -d '\r')"
    case "$loc" in ko*) adb -s "$serial" shell input keyevent 82; exit 0 ;; *) echo "::error::locale is '$loc' after the restart, expected ko-KR" >&2; exit 1 ;; esac
  fi
done
echo "::error::the framework did not come back after the locale change ($tries tries)" >&2
exit 1
