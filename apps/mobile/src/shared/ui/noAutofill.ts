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
 * Why: with 'none' iOS still showed its "Save Password?" sheet after a masked passphrase was typed (iOS 26.5 simulator, release dry runs 44246654627 and
 * 44263799485, issue #683), so the passphrase could be saved to Passwords / iCloud Keychain. React Native docs (TextInput, 0.88): textContentType is the iOS
 * autofill hint, values other than username / password / newPassword do not offer to save a login; 'oneTimeCode' marks the field as a code to fill, not a credential
 * to store. Not documented by Apple or React Native as a way to suppress the sheet: only an iOS run proves it (the release dry-run probe must reach Home with no sheet).
 * Remove it (back to NO_AUTOFILL) when a plain 'none' is shown to suppress the sheet on the iOS version in use.
 */
export const PASSPHRASE_FIELD = { ...NO_AUTOFILL, textContentType: 'oneTimeCode' } as const
