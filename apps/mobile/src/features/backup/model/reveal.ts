/**
 * Whether an AppState change means the user left S03, so a pending reveal must be dropped (#260).
 * `inactive` never counts: it is also the iOS Face ID sheet, and the auth result can arrive before `active` returns.
 * `state` is `AppState.currentState` or a change event (typed loosely by React Native). `background` counts unless an OS auth is in progress (the Android device-credential screen backgrounds the app).
 */
export const leavesReveal = (state: string | null | undefined, authInProgress: boolean): boolean =>
  state === 'background' && !authInProgress
