# 0049. The phrase screen relies on the OS capture block, and blurs the iOS app switcher

Status: Accepted (2026-11-16, issue #550, owner decision 13 of `docs/plans/quality-gates.md`). Supersedes requirements decision Q43 in part (the screenshot fallback).

## Context

- Q43 asked for four things on the phrase screen (S03, S61): no copy button, a capture block, an app-switcher blur and a screenshot fallback.
- `expo-screen-capture` 58.0.5 blocks screenshots and screen recording on iOS 13+ (secure layer) and on Android (`FLAG_SECURE`). A screenshot listener (`addScreenshotListener`) only reports a screenshot that was already taken. On Android 12 and older it needs a media permission (`READ_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES` on 13), and `FLAG_SECURE` already blocks the shot there.
- The app-switcher snapshot is a different path. The code hid the words with `setWords(null)` in an `AppState` listener. React renders after the OS takes the snapshot, so this is a race. `enableAppSwitcherProtectionAsync` was never called. Android's `FLAG_SECURE` already blanks the recents preview, and the blur API is iOS only.

## Decision

- No screenshot listener, on either platform. The OS block is the control.
- On iOS the phrase screen calls `enableAppSwitcherProtectionAsync` together with `preventScreenCaptureAsync`, before it can reveal, and the matching disable calls when the screen loses focus (`features/backup/model/capture.ts`). If protection cannot be turned on, the phrase is not shown.
- The copy rule and the existing hide on blur and on a non-`active` `AppState` stay.
- No new screen state: the blur is an OS overlay, so there is no Figma frame to add.

## Consequences

- If Apple changes the secure-layer method, a screenshot becomes possible with no notice. Re-check on each Expo SDK upgrade (`docs/testing/device-checklist.md`).
- The iOS blur also shows during the Face ID sheet and other interruptions on this screen. That is the intended behaviour.
- Q43 in `docs/decisions.md` changes from GAP to IMPLEMENTED for these parts. The rooted-device warning is still a gap (ADR-I, SEC-8).
