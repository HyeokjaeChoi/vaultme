/**
 * __DEV__ design-capture switch: the fake adapter reports too little ETH to pay a USDC fee (route param `ethShort`, see `useDevEthShort`).
 * Never read in a release build or by the real adapter. The flag lives in memory, so it stays on across the amount and review screens until cleared.
 */
let ethShort = false
const dev = (): boolean => typeof __DEV__ !== 'undefined' && __DEV__
export const isEthShort = (): boolean => dev() && ethShort
export const setEthShort = (on: boolean): void => {
  if (dev()) ethShort = on
}
