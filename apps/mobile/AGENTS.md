# apps/mobile

Expo app. Read `ARCHITECTURE.md` (code map) and `DESIGN.md` before you change a screen.

- Layers in `src/`, top to bottom: `shell` (FSD app layer; Expo Router reserves `src/app`), `pages`, `widgets`, `features`, `entities`, `shared`. `eslint.config.mjs` (boundaries) and `steiger.config.mjs` enforce the import rules; read the message when one fails.
- `app/` is the expo-router tree. A route file only re-exports from `src/shell` or `src/pages`.
- Screen work follows the `vaultme-design-to-code` skill: Figma first, then code, then light and dark comparison images in the PR.
- Copy lives in `packages/i18n`. Use the terms in `CONTEXT.md`.

## Testing OS auth on a simulator (ADR-0016)

There is no auth bypass in app code. To pass or fail the lock screen (S90) or a send auth sheet, put the sheet on screen, then run (set `SIM_UDID` or `ANDROID_SERIAL` when more than one simulator runs):

```bash
scripts/sim-auth.sh match [ios|android]    # unlock
scripts/sim-auth.sh nomatch [ios|android]  # failed attempt
```

Setup the owner does once (agents must not change device security settings; if it is missing, stop and ask):

- iOS Simulator: menu Features > Face ID > Enrolled. Without Simulator.app (Xcode 27.1): `xcrun simctl spawn <udid> notifyutil -s com.apple.BiometricKit.enrollmentChanged 1` then `xcrun simctl spawn <udid> notifyutil -p com.apple.BiometricKit.enrollmentChanged`.
- Android emulator: Settings > Security > Screen lock = PIN, then add a fingerprint; when enrollment asks for a touch, run `adb -e emu finger touch 1` (repeat until done). `sim-auth.sh` uses finger id 1 for `match` and id 9 (not enrolled) for `nomatch`. Several failed touches in a row lock biometrics; the PIN unlocks them.

Check the result in the app, not in a screenshot of the sheet: Android draws the BiometricPrompt as a secure window, so `screencap` is black. `adb -e logcat` shows `onAuthenticationFailed` / `onAuthenticationSucceeded`; `adb -e shell dumpsys window | grep mCurrentFocus` shows whether the sheet is still open (with several emulators, use `adb -s "$ANDROID_SERIAL"` instead of `-e` in these commands). The simulators are shared: tell other sessions before you drive one.
