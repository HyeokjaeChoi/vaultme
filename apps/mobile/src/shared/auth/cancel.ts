/**
 * Cancel vs failure from a keychain rejection. iOS: "User canceled the operation." (errSecUserCanceled).
 * Android (react-native-keychain): "code: <BiometricPrompt error>, msg: <text in the device language>", so the code is read, not the text:
 * 5 ERROR_CANCELED, 10 ERROR_USER_CANCELED, 13 ERROR_NEGATIVE_BUTTON. Anything else is an error.
 */
export const loadFailureStatus = (e: unknown): 'cancelled' | 'error' =>
  e instanceof Error && (/cancel/i.test(e.message) || /^code: (5|10|13),/.test(e.message)) ? 'cancelled' : 'error'
