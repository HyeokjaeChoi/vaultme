import type { AssetId } from '@vaultme/wallet-core'

let preselected: AssetId = 'ETH'

/**
 * The asset the next send starts with (owner decision 2026-10-17: Home Send = ETH, a USDC asset detail Send = USDC).
 * Held in memory because S20a (recipient) sits between the entry point and the amount screen and passes no asset param.
 * Remove when S20a forwards an `asset` route param.
 */
export const setPreselectedAsset = (a: AssetId): void => void (preselected = a)
export const getPreselectedAsset = (): AssetId => preselected
