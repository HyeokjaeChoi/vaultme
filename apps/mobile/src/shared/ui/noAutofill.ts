/**
 * Fields that take recovery-phrase words or the passphrase must never reach a password manager (no "Save Password?", no suggestions).
 * RN TextInput docs: textContentType 'none' disables iOS autofill (wins over autoComplete); autoComplete 'off' and importantForAutofill 'no' do the same on Android.
 */
export const NO_AUTOFILL = {
  autoComplete: 'off',
  textContentType: 'none',
  importantForAutofill: 'no',
  autoCorrect: false,
  spellCheck: false,
  autoCapitalize: 'none',
} as const

/**
 * The passphrase field (masked) on top of NO_AUTOFILL: textContentType 'oneTimeCode' instead of 'none'.
 * Why: with 'none' (plus autoComplete 'off') iOS still showed its "Save Password?" sheet after a masked passphrase was typed (iOS simulator, release dry runs
 * 44246654627, 44263799485, issue #683), so the passphrase could be saved to Passwords / iCloud Keychain. With 'oneTimeCode' the dry run 44276820026 showed no sheet
 * (checks before the Home wait: 6 of 6; the full run with the Home wait fixed: see PR #684). React Native docs (TextInput, 0.88): textContentType is the iOS autofill hint; they do not say it suppresses the sheet: only an iOS run shows it.
 * Side effect: iOS may offer an SMS one-time code in the QuickType bar for this field (a wrong suggestion for a secret; it fills only a code that just arrived).
 * Rejected: a plain field with our own mask (changes the screen, needs Figma, loses secureTextEntry's keyboard protections).
 * Remove it (back to NO_AUTOFILL) when a plain 'none' is shown to suppress the sheet on the iOS version in use.
 */
export const PASSPHRASE_FIELD = { ...NO_AUTOFILL, textContentType: 'oneTimeCode' } as const
