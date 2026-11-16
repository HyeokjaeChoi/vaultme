import type { Address, SpeedUpPlan } from '@vaultme/wallet-core'
import type { PendingTx } from '@/shared/storage'
import type { ChainPort } from '@/shared/chain'
import { quoteReplace, runReplace, type SpeedUpDeps } from './speedUp'

/**
 * Cancel is offered while the send is Pending (ADR-0031 D3) and, since ADR-0041, while it is Unknown (an Unknown send that never reached a node would
 * block every new send for good; the sheet warns that it may have gone through). Also after a cancel was sent: a cancel that never reached the node or is
 * underpriced can be sent again with a higher fee (no count limit; Figma 888:6647, owner 2026-11-03).
 */
export const canCancel = (tx: PendingTx, broadcasts: boolean): boolean =>
  broadcasts && (tx.state === 'Pending' || tx.state === 'Unknown')

type Snapshotter = Pick<ChainPort, 'getSnapshot' | 'getTransaction'>

/** Fee plan of a cancel: 0 ETH to the user's own account, gas 21000, same nonce (ADR-0031). */
export const quoteCancel = (tx: PendingTx, from: Address, chain: Snapshotter) => quoteReplace('cancel', tx, from, chain)

/**
 * ADR-0031 cancel after the user confirmed the sheet: the same path as `runSpeedUp` (re-read, OS auth, fresh plan, sign) with a 0 ETH self-send.
 * The record gets the new hash and `kind: 'cancel'`; its state stays Pending until the chain shows the cancel (copy never claims it before).
 */
export const runCancel = (tx: PendingTx, approved: SpeedUpPlan, from: Address, d: SpeedUpDeps) =>
  runReplace('cancel', tx, approved, from, d)
