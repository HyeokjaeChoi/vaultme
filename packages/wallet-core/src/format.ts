import { ASSETS, type AssetId } from './constants'
import { fromUnits, toUnits } from './amount'

/**
 * How an amount is shown (ARCHITECTURE.md#invariants, `ASSETS[x].display`). Presentation only: nothing parsed, stored or sent goes through here.
 * - `floor`: balances and list rows. Cut to `maxFraction` digits, never rounded up, so the app never shows more than the user owns.
 *   A non-zero value below the smallest shown step is "<0.000001" / "<0.01".
 * - `exact`: Review, result and detail. Every digit, trailing zeros trimmed (padded to `minFraction`, 0 for both assets, matching Figma "12.5 USDC") (trailing zeros trimmed: 1.50 USDC -> "1.5").
 * Returns the number only (no symbol).
 */
export function formatAmount(raw: bigint, asset: AssetId, mode: 'floor' | 'exact'): string {
  const { decimals, display } = ASSETS[asset]
  const exact = pad(fromUnits(raw, asset), display.minFraction)
  if (mode === 'exact') return exact
  const [int = '0', frac = ''] = exact.split('.')
  const cut = pad(
    frac.length > display.maxFraction ? `${int}.${frac.slice(0, display.maxFraction)}` : exact,
    display.minFraction,
  )
  const shown = trimTo(cut, display.minFraction)
  if (raw > 0n && Number(shown) === 0) return `<${smallestStep(display.maxFraction, decimals)}`
  return shown
}

/** Same for a decimal string (what the user typed or an API row carries). A string this app cannot parse is returned as is. */
export function formatDecimal(decimal: string, asset: AssetId, mode: 'floor' | 'exact'): string {
  try {
    return formatAmount(toUnits(decimal, asset), asset, mode)
  } catch {
    return decimal
  }
}

/** Pads the fraction with zeros up to `min` digits. */
function pad(s: string, min: number): string {
  const [int = '0', frac = ''] = s.split('.')
  if (min === 0) return frac ? s : int
  return `${int}.${frac.padEnd(min, '0')}`
}

/** Drops trailing zeros of the fraction down to `min` digits. */
function trimTo(s: string, min: number): string {
  const [int = '0', frac = ''] = s.split('.')
  let f = frac
  while (f.length > min && f.endsWith('0')) f = f.slice(0, -1)
  return f ? `${int}.${f}` : int
}

function smallestStep(maxFraction: number, decimals: number): string {
  const digits = Math.min(maxFraction, decimals)
  return digits === 0 ? '1' : `0.${'0'.repeat(digits - 1)}1`
}
