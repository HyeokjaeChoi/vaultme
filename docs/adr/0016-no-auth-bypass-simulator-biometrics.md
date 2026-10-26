# 0016. No auth bypass in app code; agent tests pass OS auth with simulator biometrics

Status: Accepted (2026-10-26, issue #237, owner grilling Q8).

## Context
The lock gate (S90) asks for OS auth through `authenticate()` in `apps/mobile/src/shared/auth/authenticate.ts`; each send asks for it when `loadPhrase()` reads the protected Keychain item ([ADR-0004](0004-two-tier-secret-storage.md)). An agent that tests a mobile flow on a simulator hits this prompt on every cold start and every send, and nobody is there to touch the sensor. A bypass in app code (an env flag or a debug branch) would solve it, but this is a wallet: a bypass that reaches a release build lets anyone skip OS auth. `EXPO_PUBLIC_*` values are inlined into the JS bundle, so a flag is readable and cannot be a secret switch.

## Decision
- App code has no auth bypass: no env flag, no `__DEV__` shortcut, no test mode in `authenticate()`.
- Agent tests pass or fail the real OS sheet with the simulator's own biometric simulation, through `scripts/sim-auth.sh match|nomatch [ios|android]`.
  - iOS Simulator (Face ID): `xcrun simctl spawn <udid|booted> notifyutil -p com.apple.BiometricKit_Sim.pearl.match` or `.nomatch`.
  - Android emulator: `adb -e emu finger touch <id>` (an enrolled id matches; an id that is not enrolled fails), then `finger remove`.
- The owner enrolls the simulator once (steps in `apps/mobile/AGENTS.md`). Agents do not change device security settings.

## Consequences
- No release-build risk from test tooling; the tested path is the shipped path.
- Tests need a booted, enrolled simulator and the sheet on screen; unit tests still mock `expo-local-authentication`.
- Checked 2026-10-26 (#237): Android emulator (API 37) pass and fail on the create-wallet sheet and on S90. iOS 27.0 Simulator pass and fail on S90 with the #243 fix applied (PR #248); without it, wallet creation fails first.
- The iOS notification names are not in Apple's documentation; the only source found is an unanswered Apple Developer Forums post (thread 767414). Simulator.app's Features > Face ID menu does the same by hand. If a new Xcode breaks the names, update `scripts/sim-auth.sh` and this ADR.
