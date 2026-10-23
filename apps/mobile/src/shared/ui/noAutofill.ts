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
