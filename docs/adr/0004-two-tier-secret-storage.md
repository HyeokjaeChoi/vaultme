# 0004. Secrets live in two Keychain tiers

Status: Accepted (2026-10-13 derived from the removed requirements-session doc, see git history)
Supersedes/Aliases: Q34, Q63, Q12 (per-send OS auth)

## Context
The lock gate must read app state before the first render, without a prompt. The phrase must need OS authentication on every read. `expo-secure-store` with `requireAuthentication` uses `.biometryCurrentSet` on iOS. That makes the item invalid when the user changes biometrics.

## Decision
The phrase is stored with `react-native-keychain`: `BIOMETRY_ANY_OR_DEVICE_PASSCODE`, `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`, no cloud sync. Every phrase read is an OS authentication. A send reads the phrase, so each send needs a new authentication. The MMKV encryption key and the install signing key are in a second tier: `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, no authentication. All other device data is in the encrypted MMKV store.

## Consequences
- The phrase survives a biometric change. The device passcode is the fallback.
- Anyone who can read the second tier can read the MMKV data, but not the phrase.
- Android behavior after a biometric change is not checked on a real device.
- "No cloud sync" means no `cloudSync` option at all: react-native-keychain 10.0.0 on iOS reads `cloudSync: false` as true (oblador/react-native-keychain#800), and iOS rejects the phrase item (#243). `apps/mobile/test/storage.test.ts` checks it.

<!-- verified: apps/mobile/src/shared/storage/keychain.ts, apps/mobile/src/shared/storage/kv.ts, apps/mobile/src/features/send/model/runSend.ts, apps/mobile/src/shared/auth/authenticate.ts -->
