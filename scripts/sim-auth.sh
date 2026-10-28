#!/usr/bin/env bash
# Passes or fails the OS auth sheet on a simulator, so agent tests need no finger (ADR-0016).
# Usage: scripts/sim-auth.sh match|nomatch [ios|android]   (platform default: ios)
# Target: SIM_UDID (iOS, default the only booted simulator) or ANDROID_SERIAL (Android, default the only emulator).
# The sheet must be on screen first. It only sends the event: check the result in the app.
# Setup the owner does once: see apps/mobile/AGENTS.md.
set -euo pipefail

result="${1:-}"
platform="${2:-ios}"
case "$result" in match | nomatch) ;; *) echo "usage: $0 match|nomatch [ios|android]" >&2; exit 2 ;; esac

case "$platform" in
  ios)
    # Face ID only (Touch ID devices use ...fingerTouch.*). The names are not in Apple docs; source: an
    # Apple Developer Forums post (developer.apple.com/forums/thread/767414). See ADR-0016.
    # "booted" picks one of several booted simulators, so the event can miss the sheet (#267): ask for SIM_UDID then.
    if [ -z "${SIM_UDID:-}" ]; then
      booted=$(xcrun simctl list devices booted | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}' || true)
      if [ "$(printf '%s\n' "$booted" | grep -c .)" -gt 1 ]; then
        echo "sim-auth: several simulators are booted; set SIM_UDID to one of:" >&2
        echo "$booted" >&2
        exit 2
      fi
    fi
    xcrun simctl spawn "${SIM_UDID:-booted}" notifyutil -p "com.apple.BiometricKit_Sim.pearl.$result"
    ;;
  android)
    # Console `finger touch <id>` (developer.android.com/studio/run/emulator-console#finger-print).
    # ID 1 is the enrolled finger; ID 9 is not enrolled, so the emulator reports a failed attempt.
    target=(-e)
    [ -n "${ANDROID_SERIAL:-}" ] && target=(-s "$ANDROID_SERIAL")
    id=1
    [ "$result" = nomatch ] && id=9
    # `adb emu` exits 0 even when the console answers "KO: <reason>"; fail on that instead.
    emu() { local out; out=$(adb "${target[@]}" emu "$@"); [[ $out != *KO* ]] || { echo "sim-auth: $out" >&2; exit 1; }; }
    emu finger touch "$id"
    emu finger remove
    ;;
  *) echo "unknown platform: $platform" >&2; exit 2 ;;
esac
echo "sim-auth: sent $result ($platform)"
