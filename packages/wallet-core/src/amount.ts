import { formatUnits, parseUnits } from 'viem'
import { ASSETS, type AssetId } from './constants'

export class AmountError extends Error {
  constructor(readonly code: 'format' | 'tooManyDecimals') {
    super(code)
    this.name = 'AmountError'
  }
}

/** Decimal string -> raw bigint. No rounding. Throws AmountError. */
export function toUnits(decimal: string, asset: AssetId): bigint {
  if (!/^\d+(\.\d+)?$/.test(decimal)) throw new AmountError('format')
  const { decimals } = ASSETS[asset]
  if ((decimal.split('.')[1]?.length ?? 0) > decimals) throw new AmountError('tooManyDecimals')
  return parseUnits(decimal, decimals)
}

/** Raw bigint -> decimal string. No rounding. */
export function fromUnits(raw: bigint, asset: AssetId): string {
  return formatUnits(raw, ASSETS[asset].decimals)
}

export type MaxResult = { ok: true; amount: bigint } | { ok: false; reason: 'nativeFeeShortfall' }

/** `balance` is in `asset` units. ETH pays the fee from itself; ERC-20 needs native for the fee. */
export function maxSendable(
  balance: bigint,
  asset: AssetId,
  feeCap: bigint,
  nativeBalance: bigint,
): MaxResult {
  if (ASSETS[asset].kind === 'native') {
    return { ok: true, amount: balance > feeCap ? balance - feeCap : 0n }
  }
  return nativeBalance >= feeCap
    ? { ok: true, amount: balance }
    : { ok: false, reason: 'nativeFeeShortfall' }
}
