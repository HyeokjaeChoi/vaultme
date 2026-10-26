/** Cancel vs failure from a keychain rejection. iOS: "User canceled the operation." (errSecUserCanceled); Android surfaces a cancel in its message too. Anything else is an error. */
export const loadFailureStatus = (e: unknown): 'cancelled' | 'error' =>
  e instanceof Error && /cancel/i.test(e.message) ? 'cancelled' : 'error'
