#!/usr/bin/env bash
# Builds the Release simulator app that the Maestro flows run (docs/testing/e2e.md). Output: apps/mobile/ios/build/Build/Products/Release-iphonesimulator/VaultMe.app
# Same JS as a store build; only the API points at staging (like eas.json). No test flag is compiled in (ADR-0016).
set -euo pipefail
cd "$(dirname "$0")/.."
export LANG=en_US.UTF-8
export EXPO_PUBLIC_API_URL=https://vaultme-api-staging.gurwo1007.workers.dev
export EXPO_PUBLIC_ENV=staging
node scripts/generate-licenses.mjs
CI=1 npx expo prebuild --platform ios --clean
xcodebuild -workspace ios/VaultMe.xcworkspace -scheme VaultMe -configuration Release \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/build ARCHS=arm64 ONLY_ACTIVE_ARCH=YES build | tail -n 40
