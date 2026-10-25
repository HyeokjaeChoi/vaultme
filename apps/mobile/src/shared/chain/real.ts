import {
  ASSETS,
  toUnits,
  type Address,
  type AssetId,
  type ChainSnapshot,
  type Hash,
  type Hex,
} from '@vaultme/wallet-core'
import { BALANCE_OF_SELECTOR, USDC_SEPOLIA } from '@vaultme/contracts'
import { RpcError } from '@vaultme/api-client'
import type { ChainPort, Receipt } from './port'

/** `POST /v1/rpc` as a function: returns the JSON-RPC `result`, throws on error. */
export type RpcCall = (method: string, params: unknown[]) => Promise<unknown>

const TRANSFER_SELECTOR = '0xa9059cbb'
const word = (hex: string) => hex.replace(/^0x/, '').toLowerCase().padStart(64, '0')
const quantity = (n: bigint) => `0x${n.toString(16)}`

// Used only when the node refuses to estimate (for example the balance is too low): `prepare()` then reports the real reason.
const FALLBACK_GAS: Record<AssetId, bigint> = { ETH: 21_000n, USDC: 65_000n }
// An ERC-20 transfer's gas depends on contract state; 20% headroom against an out-of-gas revert. Unused gas is refunded.
const ERC20_GAS_NUM = 12n
const ERC20_GAS_DEN = 10n

function toBig(v: unknown): bigint {
  if (typeof v !== 'string' || !/^0x[0-9a-fA-F]+$/.test(v)) throw new Error('rpc: bad quantity')
  return BigInt(v)
}

/** Real adapter over the API proxy (ARCHITECTURE.md#send). Allowed methods only; see RPC_ALLOWED_METHODS. */
export function createRpcChain(rpc: RpcCall): ChainPort {
  const balanceOf = async (address: Address) =>
    toBig(await rpc('eth_call', [{ to: USDC_SEPOLIA, data: `${BALANCE_OF_SELECTOR}${word(address)}` }, 'latest']))
  const ethBalance = async (address: Address) => toBig(await rpc('eth_getBalance', [address, 'latest']))

  async function gasLimit(from: Address, to: Address, asset: AssetId, amount: string): Promise<bigint> {
    let units = 0n
    try {
      units = toUnits(amount, asset)
    } catch {
      // Unparseable amount: prepare() rejects it. Estimate for zero.
    }
    const tx =
      ASSETS[asset].kind === 'native'
        ? { from, to, value: quantity(units) }
        : { from, to: USDC_SEPOLIA, data: `${TRANSFER_SELECTOR}${word(to)}${word(units.toString(16))}` }
    try {
      const g = toBig(await rpc('eth_estimateGas', [tx]))
      return ASSETS[asset].kind === 'native' ? g : (g * ERC20_GAS_NUM) / ERC20_GAS_DEN
    } catch (e) {
      if (e instanceof RpcError) return FALLBACK_GAS[asset]
      throw e
    }
  }

  return {
    broadcasts: true,
    async getBalances(address) {
      const [ETH, USDC] = await Promise.all([ethBalance(address), balanceOf(address)])
      return { ETH, USDC }
    },
    async getSnapshot(address, asset, to, amount): Promise<ChainSnapshot> {
      const [nativeBalance, tokenBalance, nonce, gas, history, tip] = await Promise.all([
        ethBalance(address),
        balanceOf(address),
        rpc('eth_getTransactionCount', [address, 'pending']),
        gasLimit(address, to, asset, amount),
        rpc('eth_feeHistory', [1, 'latest', []]),
        rpc('eth_maxPriorityFeePerGas', []),
      ])
      // feeHistory.baseFeePerGas has one entry more than the blocks asked for: the last one is the next block's base fee.
      const fees = (history as { baseFeePerGas?: unknown } | null)?.baseFeePerGas
      if (!Array.isArray(fees) || fees.length === 0) throw new Error('rpc: bad feeHistory')
      return {
        nonce: Number(toBig(nonce)),
        nativeBalance,
        tokenBalance,
        gasLimit: gas,
        baseFeePerGas: toBig(fees[fees.length - 1]),
        maxPriorityFeePerGas: toBig(tip),
      }
    },
    async submit(raw: Hex): Promise<Hash> {
      const h = await rpc('eth_sendRawTransaction', [raw])
      if (typeof h !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(h)) throw new Error('rpc: bad tx hash')
      return h as Hash // wallet-core compares it with the locally computed hash (ADR-0005)
    },
    async getSafeBlock() {
      const b = (await rpc('eth_getBlockByNumber', ['safe', false])) as { number?: unknown } | null
      return toBig(b?.number)
    },
    async getSafeNonce(address) {
      return toBig(await rpc('eth_getTransactionCount', [address, 'safe']))
    },
    async getReceipt(hash: Hash): Promise<Receipt | null> {
      const r = await rpc('eth_getTransactionReceipt', [hash])
      if (r === null) return null
      const o = r as { status?: unknown; blockNumber?: unknown }
      if (o.blockNumber == null) return null
      return { status: toBig(o.status) === 1n ? 'success' : 'reverted', blockNumber: toBig(o.blockNumber) }
    },
  }
}
