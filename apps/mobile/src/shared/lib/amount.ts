import { ASSETS, formatDecimal, toUnits, type AssetId } from '@vaultme/wallet-core'

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | '.' | 'backspace'

const MAX_LENGTH = 12 // amounts wrap in layout, but the keypad stops before the hero text gets too wide
const MAX_DECIMALS = 18

/** Pure keypad edit of an amount string. The string is never empty ("0" is the floor). Display only: no money math. */
export function applyKey(amount: string, key: KeypadKey): string {
  if (key === 'backspace') {
    const next = amount.slice(0, -1)
    return next === '' ? '0' : next
  }
  if (key === '00') return applyKey(applyKey(amount, '0'), '0')
  if (key === '.') return amount.includes('.') ? amount : `${amount}.`
  if (amount.length >= MAX_LENGTH) return amount
  const frac = amount.split('.')[1]
  if (frac !== undefined && frac.length >= MAX_DECIMALS) return amount
  return amount === '0' ? key : amount + key
}

export const isZeroAmount = (amount: string) => !/[1-9]/.test(amount)

/** True when `amount` (keypad string, "5." allowed) is more ETH than `available`. Unparseable counts as not exceeding. */
export function exceedsBalance(amount: string, available: string): boolean {
  try {
    return toUnits(amount.replace(/\.$/, '') || '0', 'ETH') > toUnits(available, 'ETH')
  } catch {
    return false
  }
}

/** "0.05 ETH" for a stored or API amount string: `floor` in lists, `exact` on Review, result and detail (wallet-core formatDecimal). An unknown asset is shown as given. */
export function showAmount(amount: string, asset: string, mode: 'floor' | 'exact'): string {
  return `${asset in ASSETS ? formatDecimal(amount, asset as AssetId, mode) : amount} ${asset}`
}
