# 0028. A rooted or jailbroken device gets a warn-only notice; the screenshot fallback is dropped

Status: Accepted (2026-11-02 from issue #318, owner decision of 2026-11-02)
Supersedes/Aliases: Q43 in part (no screenshot fallback; the rooted-device warning is built)

## Context
Q43 asked for four things on the phrase screen: no copy, capture block, app-switcher blur, and a screenshot fallback. It also asked for a rooted-device warning. The first three exist. #318 tracked the other two.

## Decision
- **No screenshot fallback.** `addScreenshotListener` is not used. `preventScreenCaptureAsync` already blocks screenshots and recordings on iOS 13+ (the app runs on iOS 15.1+) and on Android (`FLAG_SECURE`), so a fallback would never fire on a supported OS. On Android 13 and older, detection needs `READ_EXTERNAL_STORAGE` (Android 13: `READ_MEDIA_IMAGES`), which is a privacy cost for a wallet. No code change.
- **Rooted or jailbroken warning, warn only.** `useDeviceCheckBoot` (`apps/mobile/src/features/device-check`) runs in the root navigator. It calls `Device.isRootedExperimentalAsync()` from `expo-device`. On `true` it opens B-S92 (`/settings/device`, Figma 423:15474) once and saves `device.warningShown` in the encrypted kv. Never blocks the app.
- A check that throws or returns `false` shows nothing and saves nothing, so the next launch tries again. After B-S92 was shown, the check is not run again.
- The S60 row never says the device was checked (no "확인됨"): the check is experimental and can miss.

## Consequences
- `expo-device` ~58.0.5 is a new native module: a new dev-client build is needed.
- The check can give a false positive (a non-rooted Android device with an `su` file) and a false negative (hooking tools such as xCon). B-S92 text claims no check result.
- A user can still use a rooted device. This is a notice, not a control.

## Sources
- expo-screen-capture (latest, installed ~58.0.5): https://docs.expo.dev/versions/latest/sdk/screen-capture/ . Checked in the installed `ScreenCapture.d.ts`: `preventScreenCaptureAsync` (iOS 13+ screenshots, Android `FLAG_SECURE`), `addScreenshotListener` permissions (`READ_EXTERNAL_STORAGE`, Android 13 `READ_MEDIA_IMAGES`).
- expo-device (latest and installed 58.0.5, published 2026-10-01): https://docs.expo.dev/versions/latest/sdk/device/ . Checked in the installed `Device.d.ts`: `isRootedExperimentalAsync` is experimental, can be bypassed, resolves `false` on web.
- Not checked: the docs web pages themselves (read from the installed package typings, which hold the same text); the Expo minimum iOS 15.1 comes from the owner's decision.

<!-- verified: apps/mobile/src/features/device-check/model/deviceCheck.ts, apps/mobile/test/device-check.test.ts -->
