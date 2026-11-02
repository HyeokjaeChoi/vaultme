import type { Address, SpeedUpPlan } from '@vaultme/wallet-core'
import type { PendingTx } from '@/shared/storage'
import type { SendDeps } from './runSend'
import { canSpeedUp, quoteReplace, runReplace } from './speedUp'

/** Cancel is offered in the same cases as speed up: Pending, nothing replaced it yet (ADR-0031 D3). */
export const canCancel = canSpeedUp

type Snapshotter = Pick<SendDeps['chain'], 'getSnapshot'>

/** Fee plan of a cancel: 0 ETH to the user's own account, gas 21000, same nonce (ADR-0031). */
export const quoteCancel = (tx: PendingTx, from: Address, chain: Snapshotter) => quoteReplace('cancel', tx, from, chain)

/**
 * ADR-0031 cancel after the user confirmed the sheet: the same path as `runSpeedUp` (re-read, OS auth, fresh plan, sign) with a 0 ETH self-send.
 * The record gets the new hash and `kind: 'cancel'`; its state stays Pending until the chain shows the cancel (copy never claims it before).
 */
export const runCancel = (tx: PendingTx, approved: SpeedUpPlan, from: Address, d: SendDeps) =>
  runReplace('cancel', tx, approved, from, d)
