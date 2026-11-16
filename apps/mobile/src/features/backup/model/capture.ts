import {
  allowScreenCaptureAsync,
  disableAppSwitcherProtectionAsync,
  enableAppSwitcherProtectionAsync,
  preventScreenCaptureAsync,
} from 'expo-screen-capture'

/**
 * Capture protection for the phrase screen (ADR-J). The OS blocks screenshots and recording (iOS 13+ secure layer, Android FLAG_SECURE; no screenshot listener).
 * iOS also blurs the app-switcher snapshot, which does not wait for React to hide the words. Android's FLAG_SECURE already blanks the recents preview, and the blur API is iOS only.
 * Resolves only when protection is on; the caller must not reveal if it rejects.
 */
export async function protectPhrase(key: string, ios: boolean): Promise<void> {
  await preventScreenCaptureAsync(key)
  if (ios) await enableAppSwitcherProtectionAsync()
}

export async function releasePhrase(key: string, ios: boolean): Promise<void> {
  try {
    await allowScreenCaptureAsync(key)
  } finally {
    if (ios) await disableAppSwitcherProtectionAsync() // the blur must not stay on when the capture release rejects
  }
}
