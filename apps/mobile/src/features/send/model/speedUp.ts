import { marketFeesOf, planSpeedUp, toUnits, type Address, type AssetId, type SpeedUpPlan } from '@vaultme/wallet-core'
import { signReplacement } from '@vaultme/wallet-core/signer'
import type { PendingTx } from '@/shared/storage'
import { ownHashes } from './hashes'
import { parseSendAsset } from './limits'
import type { SendDeps } from './runSend'

/** Speed up is offered only while the send is Pending (ADR-0031 D3). */
export const canSpeedUp = (tx: PendingTx, broadcasts: boolean): boolean => broadcasts && tx.state === 'Pending'

type Snapshotter = Pick<SendDeps['chain'], 'getSnapshot'>

/**
 * The fee plan of a speed up from a fresh snapshot (market fees, gas limit, ETH balance): the sheet shows it, `runSpeedUp` checks it again.
 * Base = the latest sent fee fields. A record saved before ADR-0031 has none: the market value is the base then (its original was priced at the market of its day).
 */
export async function quoteSpeedUp(tx: PendingTx, from: Address, chain: Snapshotter): Promise<SpeedUpPlan> {
  const asset: AssetId = parseSendAsset(tx.asset)
  const snap = await chain.getSnapshot(from, asset, tx.to as Address, tx.amount)
  const market = marketFeesOf(snap)
  return planSpeedUp({
    latestSent: {
      maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : market.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas) : market.maxPriorityFeePerGas,
    },
    market,
    gasLimit: snap.gasLimit,
    asset,
    amount: toUnits(tx.amount, asset),
    nativeBalance: snap.nativeBalance,
  })
}

export type SpeedUpOutcome =
  /** Sent and recorded. `Unknown`: the network answer was unclear, the new hash is recorded and the checks decide. */
  | { status: 'Sent' | 'Unknown'; tx: PendingTx }
  /** The fee rose above what the sheet showed, or ETH is short now: the sheet shows the new plan. */
  | { status: 'NeedsReview'; plan: SpeedUpPlan }
  | { status: 'Blocked' | 'Cancelled' | 'AuthError' | 'NotPending' }
  | { status: 'ChainError'; error: unknown }

/**
 * ADR-0031 speed up after the user confirmed the sheet. The same path as a send: OS auth (the phrase read IS the auth) -> fresh snapshot -> sign.
 * Same nonce, to, value and data; only the fee fields change. `approved` = the plan the sheet showed: a fresh plan that costs more asks again.
 * The new hash is added to the record at once, so a receipt for it is found even when the answer was unclear.
 */
export async function runSpeedUp(
  tx: PendingTx,
  approved: SpeedUpPlan,
  from: Address,
  d: SendDeps,
): Promise<SpeedUpOutcome> {
  const cur = d.readPending()
  if (cur === null || cur === 'corrupt' || cur.hash !== tx.hash || cur.state !== 'Pending')
    return { status: 'NotPending' }

  const auth = await d.loadPhrase(d.prompt)
  if (auth.status === 'cancelled') return { status: 'Cancelled' }
  if (auth.status === 'error') return { status: 'AuthError' }

  const asset = parseSendAsset(cur.asset)
  let result
  let plan: SpeedUpPlan
  try {
    plan = await quoteSpeedUp(cur, from, d.chain)
    if (plan.newFeeCap > approved.newFeeCap || plan.shortBy > 0n) return { status: 'NeedsReview', plan }
    result = await signReplacement(
      {
        asset,
        to: cur.to as Address,
        amount: toUnits(cur.amount, asset),
        gasLimit: plan.gasLimit,
        nonce: cur.nonce,
        maxFeePerGas: plan.maxFeePerGas,
        maxPriorityFeePerGas: plan.maxPriorityFeePerGas,
      },
      { mnemonic: auth.mnemonic, submit: (raw) => d.chain.submit(raw) },
    )
  } catch (error) {
    return { status: 'ChainError', error }
  }
  if (result.status === 'Blocked') return { status: 'Blocked' }
  if (result.status === 'NeedsReview') return { status: 'NeedsReview', plan }

  const next: PendingTx = {
    ...cur,
    hashes: [...ownHashes(cur), result.hash],
    kind: 'speedUp',
    maxFeePerGas: String(plan.maxFeePerGas),
    maxPriorityFeePerGas: String(plan.maxPriorityFeePerGas),
    lastCheckedAt: d.now(),
  }
  try {
    d.savePending(next)
  } catch {
    return { status: 'Unknown', tx: next }
  }
  return { status: result.status === 'Pending' ? 'Sent' : 'Unknown', tx: next }
}
