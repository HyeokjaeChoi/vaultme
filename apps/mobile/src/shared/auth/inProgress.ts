// While an OS auth dialog is up, AppState goes inactive/background for a moment. The lock timer must not count that as the user leaving (Q13).
let inProgress = 0
export const isAuthInProgress = (): boolean => inProgress > 0

/** Runs `fn` (anything that shows an OS auth dialog) with the "auth in progress" flag set. */
export async function withAuthInProgress<T>(fn: () => Promise<T>): Promise<T> {
  inProgress++
  try {
    return await fn()
  } finally {
    inProgress--
  }
}
