# 0050. The rooted-device warning is advisory (jail-monkey, once per install)

Status: Accepted (2026-11-16, issue #318, owner decision 12 of `docs/plans/quality-gates.md`; the owner's recommended option, relayed by the orchestrator session). Completes requirements decision Q43 (the rooted-device warning).

## Context

- Q43 and `ARCHITECTURE.md` (Security model) said there is no root or jailbreak check. A phone with root or a jailbreak lets other apps read app data.
- Detection is bypassable. Blocking a flagged phone locks a user out of their own funds on a false positive. The app holds Sepolia test funds only.
- Screen B-S92 (Figma 423:15474, dark 430:16113, "기기 보안 안내") exists and opens from the S60 row. It has no trigger of its own.
- `expo-device` has only `isRootedExperimentalAsync`. `jail-monkey` 3.0.0 (MIT, published 2026-04-28, ctx7 `/gantman/jail-monkey`) gives the sync `isJailBroken(): boolean` for iOS and Android and needs a dev client or prebuild (no Expo Go). It declares no JS dependency.

## Decision

- On cold start, when the kv store is open, `useDeviceCheckBoot` (`features/device-check`) calls `JailMonkey.isJailBroken()`. If it is `true` and the warning was not shown before, the app saves `device.warningShown` and opens B-S92 once.
- The warning never blocks: no lock, no limit, no feature switched off. The button closes the screen.
- A check that throws, or says `false`, shows nothing and is tried again at the next launch. The warning is not repeated after it was shown once.
- No copy says the device was "checked": the S60 row keeps no "확인됨" value, because the check can miss.
- The decision logic is `shouldWarnDevice` (pure). Its test covers every branch (100 %).
- A PR that ships a new native module needs a new dev-client build; SEC-11 (`native-config.test.ts`) fails if jail-monkey adds an Android permission that is not in `apps/mobile/android-permissions.allow`.

## Consequences

- A rooted phone with a hook that hides root passes unseen. The warning is advice, not a control.
- jail-monkey's ~10 Android root signals may flag a custom ROM or a developer phone. One dismissible screen costs little for a false positive.
- `docs/testing/device-checklist.md` has a manual check on a rooted Android emulator.
