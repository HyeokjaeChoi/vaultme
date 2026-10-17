import { ASSETS, formatDecimal, toUnits, type AssetId } from '@vaultme/wallet-core'

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | '.' | 'backspace'

const MAX_LENGTH = 12 // amounts wrap in layout, but the keypad stops before the hero text gets too wide

/** Pure keypad edit of an amount string. The string is never empty ("0" is the floor). Display only: no money math. `decimals` = fraction digits the asset allows (ETH 18, USDC 6). */
export function applyKey(amount: string, key: KeypadKey, decimals: number = ASSETS.ETH.decimals): string {
  if (key === 'backspace') {
    const next = amount.slice(0, -1)
    return next === '' ? '0' : next
  }
  if (key === '00') return applyKey(applyKey(amount, '0', decimals), '0', decimals)
  if (key === '.') return amount.includes('.') ? amount : `${amount}.`
  if (amount.length >= MAX_LENGTH) return amount
  const frac = amount.split('.')[1]
  if (frac !== undefined && frac.length >= decimals) return amount
  return amount === '0' ? key : amount + key
}

/**
 * Keypad press against the sendable max. A key that would make the amount exceed `sendable` is rejected (amount unchanged, `overMax`); backspace is always allowed.
 * `accepted` is false for any rejected key (over max, max length, max decimals, second "."). `sendable` null = not known yet: no max check.
 */
export function pressKey(amount: string, key: KeypadKey, sendable: string | null, asset: AssetId = 'ETH'): { amount: string; accepted: boolean; overMax: boolean } {
  const next = applyKey(amount, key, ASSETS[asset].decimals)
  if (key === 'backspace') return { amount: next, accepted: true, overMax: false }
  if (next === amount) return { amount, accepted: false, overMax: false }
  if (sendable !== null && exceedsBalance(next, sendable, asset)) return { amount, accepted: false, overMax: true }
  return { amount: next, accepted: true, overMax: false }
}

export const isZeroAmount = (amount: string) => !/[1-9]/.test(amount)

/** True when `amount` (keypad string, "5." allowed) is more of `asset` than `available`. Unparseable counts as not exceeding. */
export function exceedsBalance(amount: string, available: string, asset: AssetId = 'ETH'): boolean {
  try {
    return toUnits(amount.replace(/\.$/, '') || '0', asset) > toUnits(available, asset)
  } catch {
    return false
  }
}

/** "0.05 ETH" for a stored or API amount string: `floor` in lists, `exact` on Review, result and detail (wallet-core formatDecimal). An unknown asset is shown as given. */
export function showAmount(amount: string, asset: string, mode: 'floor' | 'exact'): string {
  return `${asset in ASSETS ? formatDecimal(amount, asset as AssetId, mode) : amount} ${asset}`
}
