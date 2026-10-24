/**
 * Returns an AppState handler that calls `onForeground` once per return to "active" (background or inactive -> active).
 * Pure: the subscription is made by `useOnForeground`. `initial` is the state when the trigger is made.
 */
export function createForegroundTrigger(
  onForeground: () => void,
  initial: string | null = 'active',
): (state: string) => void {
  let last: string | null = initial
  return (state) => {
    const back = state === 'active' && last !== 'active'
    last = state
    if (back) onForeground()
  }
}
