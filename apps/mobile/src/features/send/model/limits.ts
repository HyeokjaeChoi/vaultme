import {
  ASSETS,
  chipAmount,
  fromUnits,
  maxSendable,
  type AssetId,
  type ChipShare,
  type Warning,
} from '@vaultme/wallet-core'

/** Balance of the asset being sent (its own units), the ETH balance that pays the fee, and the worst-case fee cap. */
export type Sendable = { balance: bigint; nativeBalance: bigint; feeCap: bigint }

export const CHIP_SHARES = [25, 50, 100] as const satisfies readonly ChipShare[]

export type SendLimits = {
  /** Most the user may type, as a decimal string. ETH: balance minus the fee cap. USDC: the whole balance (the fee is paid in ETH, never from it). null = not known yet. */
  sendable: string | null
  /** USDC only: the ETH balance does not cover the fee cap, so nothing can be sent. Chips are off and Review blocks. */
  feeShort: boolean
  chips: { pct: ChipShare; raw: bigint; value: string }[]
}

/** Amount-screen limits for one asset. `snap` null (loading, or the network could not be asked) leaves every chip off. */
export function sendLimits(asset: AssetId, snap: Sendable | null): SendLimits {
  const chips = CHIP_SHARES.map((pct) => {
    const raw = snap ? chipAmount(asset, pct, snap.balance, snap.feeCap, snap.nativeBalance) : 0n
    return { pct, raw, value: fromUnits(raw, asset) }
  })
  if (!snap) return { sendable: null, feeShort: false, chips }
  const max = maxSendable(snap.balance, asset, snap.feeCap, snap.nativeBalance)
  if (asset === 'ETH') return { sendable: max.ok ? fromUnits(max.amount, asset) : null, feeShort: false, chips }
  return { sendable: fromUnits(snap.balance, asset), feeShort: !max.ok, chips }
}

/** How much ETH is missing for the fee, from the wallet-core `prepare()` warnings. null = no shortfall. */
export function feeShortBy(warnings: readonly Warning[]): bigint | null {
  for (const w of warnings) if (w.kind === 'nativeFeeShortfall') return w.shortBy
  return null
}

/** The asset of the send flow from a route param or the stored preselection: anything but "USDC" is ETH (Home Send default). */
export const parseSendAsset = (raw: string | undefined | null): AssetId => (raw === 'USDC' ? 'USDC' : 'ETH')

/**
 * Balance in the asset sheet: exactly 2 fraction digits, floored (never more than owned), "<0.01" for a non-zero dust balance (issue #64 decision 6, Figma "1.28 ETH" / "25.50 USDC").
 * Number only, no symbol. Presentation only.
 */
export function listBalance(raw: bigint, asset: AssetId): string {
  const cents = raw / 10n ** BigInt(ASSETS[asset].decimals - 2)
  if (raw > 0n && cents === 0n) return '<0.01'
  return `${String(cents / 100n)}.${(cents % 100n).toString().padStart(2, '0')}`
}
