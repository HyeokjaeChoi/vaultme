import type { Address, AssetId, ChainSnapshot, Hash, Hex } from '@vaultme/wallet-core'

/**
 * Chain access for the app. Shaped after POST /v1/rpc (lld.md §4): getSnapshot = eth_getBalance, eth_call(balanceOf),
 * eth_getTransactionCount, eth_estimateGas, eth_feeHistory; submit = eth_sendRawTransaction.
 */
export type Receipt = { status: 'success' | 'reverted'; blockNumber: bigint }

export type ChainPort = {
  /** `amount` is the decimal string the user typed (gas estimation input). */
  getSnapshot(address: Address, asset: AssetId, to: Address, amount: string): Promise<ChainSnapshot>
  /** Returns the hash the node reports. */
  submit(raw: Hex): Promise<Hash>
  /** Balances in base units (wei, USDC 6 decimals). Home. */
  getBalances(address: Address): Promise<Record<AssetId, bigint>>
  /** eth_getTransactionReceipt: null while the tx is not in a block. */
  getReceipt(hash: Hash): Promise<Receipt | null>
  /** eth_getBlockByNumber('safe', false): the number of the newest `safe` block (Q37). A receipt at or below it is final. */
  getSafeBlock(): Promise<bigint>
  /** eth_getTransactionCount(address, 'safe'): the account nonce as of the `safe` block (Replaced, Q77). */
  getSafeNonce(address: Address): Promise<bigint>
  /** false = nothing leaves the device (fake adapter). The UI says so and hides explorer links. */
  readonly broadcasts: boolean
}

const ETHERSCAN_TX = 'https://sepolia.etherscan.io/tx/'

/** Explorer link for a tx hash, or null while the adapter does not broadcast (the hash is not on any network). */
export const explorerUrl = (c: Pick<ChainPort, 'broadcasts'>, hash: string): string | null =>
  c.broadcasts ? `${ETHERSCAN_TX}${hash}` : null
