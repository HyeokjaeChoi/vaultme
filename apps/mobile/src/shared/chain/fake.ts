import { toUnits, txHash, type AssetId, type ChainSnapshot } from '@vaultme/wallet-core'
import { assets } from '@/entities/asset/fixtures'
import type { ChainPort } from './port'

export type NonceStore = { get(): number; set(n: number): void }

const GWEI = 1_000_000_000n
// Fee numbers of the Review fixture: gasLimit 21000 x (2 x base 1.5 gwei + tip 0.5 gwei) = 0.0000735 ETH cap, 0.000042 ETH estimate.
const BASE_FEE = 3n * GWEI / 2n
const TIP = GWEI / 2n
const GAS_LIMIT: Record<AssetId, bigint> = { ETH: 21_000n, USDC: 65_000n }

const balance = (symbol: AssetId) => toUnits(assets.find((a) => a.symbol === symbol)?.balance ?? '0', symbol)

/** Fake adapter (dev and tests without an API, `EXPO_PUBLIC_API_URL` unset): fixture snapshot, local hash, no network. */
export function createFakeChain(nonce: NonceStore): ChainPort {
  return {
    broadcasts: false,
    async getBalances() {
      return { ETH: balance('ETH'), USDC: balance('USDC') }
    },
    async getReceipt() {
      return null // nothing was sent, so nothing is ever mined
    },
    async getSafeBlock() {
      return 0n
    },
    async getSafeNonce() {
      return 0n
    },
    async getSnapshot(_address, asset): Promise<ChainSnapshot> {
      return {
        nonce: nonce.get(),
        nativeBalance: balance('ETH'),
        tokenBalance: balance('USDC'),
        gasLimit: GAS_LIMIT[asset],
        baseFeePerGas: BASE_FEE,
        maxPriorityFeePerGas: TIP,
      }
    },
    async submit(raw) {
      nonce.set(nonce.get() + 1)
      return txHash(raw)
    },
  }
}
