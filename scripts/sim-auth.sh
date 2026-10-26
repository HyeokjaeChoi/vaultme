#!/usr/bin/env bash
# Passes or fails the OS auth sheet on a simulator, so agent tests need no finger (ADR-0016).
# Usage: scripts/sim-auth.sh match|nomatch [ios|android]   (platform default: ios)
# The sheet must be on screen first. Setup the owner does once: see apps/mobile/AGENTS.md.
set -euo pipefail

result="${1:-}"
platform="${2:-ios}"
case "$result" in match | nomatch) ;; *) echo "usage: $0 match|nomatch [ios|android]" >&2; exit 2 ;; esac

case "$platform" in
  ios)
    # Face ID. Sources: Simulator menu Features > Face ID > Matching/Non-matching Face (Apple, Simulator Help);
    # the notification names are not in Apple docs (see ADR-0016 for how they were checked).
    xcrun simctl spawn booted notifyutil -p "com.apple.BiometricKit_Sim.pearl.$result"
    ;;
  android)
    # Console `finger touch <id>` (developer.android.com/studio/run/emulator-console#finger-print).
    # ID 1 is the enrolled finger; ID 9 is not enrolled, so the emulator reports a failed attempt.
    id=1
    [ "$result" = nomatch ] && id=9
    adb -e emu finger touch "$id" >/dev/null
    adb -e emu finger remove >/dev/null
    ;;
  *) echo "unknown platform: $platform" >&2; exit 2 ;;
esac
echo "sim-auth: $result ($platform)"
