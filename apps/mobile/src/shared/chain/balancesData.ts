import { ASSETS, type AssetId } from '@vaultme/wallet-core'

/** Balance cache entry: base units as decimal strings. A bigint does not survive JSON, and the TanStack cache is written to MMKV (ADR-0021). */
export type BalancesRaw = Record<AssetId, string>

export const balancesKey = (address: string) => ['balances', address] as const

export const toRaw = (b: Record<AssetId, bigint>): BalancesRaw => ({ ETH: b.ETH.toString(), USDC: b.USDC.toString() })

/** null when the entry is not a pair of decimal strings (a damaged stored cache): the screens then show no number until the next read. */
export function fromRaw(raw: unknown): Record<AssetId, bigint> | null {
  if (typeof raw !== 'object' || raw === null) return null
  const ids = Object.keys(ASSETS) as AssetId[]
  const out = {} as Record<AssetId, bigint>
  for (const id of ids) {
    const v = (raw as Record<string, unknown>)[id]
    if (typeof v !== 'string' || !/^\d+$/.test(v)) return null
    out[id] = BigInt(v)
  }
  return out
}
