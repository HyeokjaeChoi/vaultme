#!/usr/bin/env bash
# Builds the Release APK that the Maestro flows run on an emulator (docs/testing/e2e.md). Output: apps/mobile/android/app/build/outputs/apk/release/app-release.apk
# Same JS as a store build; only the API points at staging (like eas.json). No test flag is compiled in (ADR-0016).
set -euo pipefail
cd "$(dirname "$0")/.."
export EXPO_PUBLIC_API_URL=https://vaultme-api-staging.gurwo1007.workers.dev
export EXPO_PUBLIC_ENV=staging
node scripts/generate-licenses.mjs
CI=1 npx expo prebuild --platform android --clean
# x86_64 only: the CI emulator is x86_64, and one ABI halves the native build.
(cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64 | tail -n 40)
