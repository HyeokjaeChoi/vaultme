import {
  fromUnits,
  marketFeesOf,
  planCancel,
  planSpeedUp,
  toUnits,
  type Address,
  type AssetId,
  type FeeFields,
  type Hash,
  type SpeedUpPlan,
} from '@vaultme/wallet-core'
import { signReplacement } from '@vaultme/wallet-core/signer'
import type { ChainPort } from '@/shared/chain'
import type { PendingTx } from '@/shared/storage'
import { ownHashes } from './hashes'
import { parseSendAsset } from './limits'
import type { SendDeps } from './runSend'

/** Speed up is offered only while the send is Pending (ADR-0031 D3). */
export const canSpeedUp = (tx: PendingTx, broadcasts: boolean): boolean =>
  broadcasts && tx.state === 'Pending' && tx.kind !== 'cancel' // after a cancel was sent there is no second action (Figma 888:6647)

type Snapshotter = Pick<ChainPort, 'getSnapshot' | 'getTransaction'>
export type SpeedUpDeps = Omit<SendDeps, 'chain'> & { chain: SendDeps['chain'] & Pick<ChainPort, 'getTransaction'> }

export type ReplaceKind = 'speedUp' | 'cancel'

/**
 * Where a replacement starts from: the fee fields (and, for a speed up, the gas limit) the latest tx was signed with. The record holds them; one
 * written before they were saved has none, so the sent tx is read from the chain by hash (newest own hash first: the newest may never have reached
 * the node). A tx the node does not know throws: a bump from today's market value could be refused as underpriced. A cancel is always 21000 gas.
 */
async function sentBase(tx: PendingTx, chain: Pick<ChainPort, 'getTransaction'>, needGas: boolean) {
  let fees: FeeFields | null = null
  let gasLimit = tx.gasLimit ? BigInt(tx.gasLimit) : null
  if (tx.maxFeePerGas && tx.maxPriorityFeePerGas)
    fees = { maxFeePerGas: BigInt(tx.maxFeePerGas), maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas) }
  if (fees === null || (needGas && gasLimit === null)) {
    // eslint-disable-next-line unicorn/no-array-reverse -- Hermes has no toReversed (#93); the copy keeps the record's list as it is
    for (const h of [...ownHashes(tx)].reverse()) {
      const sent = await chain.getTransaction(h as Hash)
      if (!sent) continue
      fees ??= { maxFeePerGas: sent.maxFeePerGas, maxPriorityFeePerGas: sent.maxPriorityFeePerGas }
      gasLimit ??= sent.gasLimit
      break
    }
  }
  if (fees === null || (needGas && gasLimit === null))
    throw new Error('replace: the sent transaction is not known to the node')
  return { latestSent: fees, gasLimit }
}

/**
 * The fee plan of a speed up or cancel from a fresh snapshot (market fees, ETH balance) and the sent tx: the sheet shows it, `runReplace` checks it again.
 * Base = the latest sent fee fields; a speed up keeps the gas limit the send was signed with (`sentBase`). A cancel is a 0 ETH send to `from` (gas 21000, `planCancel`).
 */
export async function quoteReplace(
  kind: ReplaceKind,
  tx: PendingTx,
  from: Address,
  chain: Snapshotter,
): Promise<SpeedUpPlan> {
  const asset: AssetId = parseSendAsset(tx.asset)
  const cancel = kind === 'cancel'
  const [snap, base] = await Promise.all([
    chain.getSnapshot(from, cancel ? 'ETH' : asset, cancel ? from : (tx.to as Address), cancel ? '0' : tx.amount),
    sentBase(tx, chain, !cancel),
  ])
  const market = marketFeesOf(snap)
  if (cancel)
    return planCancel({
      latestSent: base.latestSent,
      market,
      baseFeePerGas: snap.baseFeePerGas,
      nativeBalance: snap.nativeBalance,
    })
  return planSpeedUp({
    latestSent: base.latestSent,
    gasLimit: base.gasLimit ?? snap.gasLimit, // never null for a speed up (`sentBase` throws)
    market,
    baseFeePerGas: snap.baseFeePerGas,
    asset,
    amount: toUnits(tx.amount, asset),
    nativeBalance: snap.nativeBalance,
  })
}

export const quoteSpeedUp = (tx: PendingTx, from: Address, chain: Snapshotter) =>
  quoteReplace('speedUp', tx, from, chain)

export type SpeedUpOutcome =
  /** `Sent`: the node took it and the record says so. `Unknown`: the answer was unclear (or the record could not be saved): the new hash is recorded when it could be, the checks decide, and nothing is claimed. */
  | { status: 'Sent' | 'Unknown'; tx: PendingTx }
  /** The fee rose above what the sheet showed, or ETH is short now: the sheet shows the new plan. */
  | { status: 'NeedsReview'; plan: SpeedUpPlan }
  | { status: 'Blocked' | 'Cancelled' | 'AuthError' | 'NotPending' }
  /** The network could not be asked, or the node refused the tx (underpriced, nonce too low, insufficient funds): nothing is recorded. */
  | { status: 'ChainError'; error: unknown }

export const runSpeedUp = (tx: PendingTx, approved: SpeedUpPlan, from: Address, d: SpeedUpDeps) =>
  runReplace('speedUp', tx, approved, from, d)

/**
 * ADR-0031 speed up or cancel after the user confirmed the sheet. The same path as a send: OS auth (the phrase read IS the auth) -> fresh snapshot -> sign.
 * Same nonce, to, value, data and (speed up) gas limit; only the fee fields change. `approved` = the plan the sheet showed: a fresh plan that costs more asks again.
 * The new hash is added to the record at once, so a receipt for it is found even when the answer was unclear. The record is read again right before
 * it is saved: a check may have moved the state during auth and submit, and that newer state is kept.
 */
export async function runReplace(
  kind: ReplaceKind,
  tx: PendingTx,
  approved: SpeedUpPlan,
  from: Address,
  d: SpeedUpDeps,
): Promise<SpeedUpOutcome> {
  const cur = d.readPending()
  if (cur === null || cur === 'corrupt' || cur.hash !== tx.hash || cur.state !== 'Pending')
    return { status: 'NotPending' }
  if (approved.overAbsCap) return { status: 'Blocked' } // before device auth

  const auth = await d.loadPhrase(d.prompt)
  if (auth.status === 'cancelled') return { status: 'Cancelled' }
  if (auth.status === 'error') return { status: 'AuthError' }

  const asset = parseSendAsset(cur.asset)
  const cancel = kind === 'cancel'
  let result
  let plan: SpeedUpPlan
  try {
    plan = await quoteReplace(kind, cur, from, d.chain)
    if (plan.newFeeCap > approved.newFeeCap || plan.shortBy > 0n) return { status: 'NeedsReview', plan }
    result = await signReplacement(
      {
        asset: cancel ? 'ETH' : asset,
        to: cancel ? from : (cur.to as Address),
        amount: cancel ? 0n : toUnits(cur.amount, asset),
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

  const latest = d.readPending()
  // The record is gone or is another send now: nothing to write to (the new hash cannot be kept).
  if (latest === null || latest === 'corrupt' || latest.hash !== cur.hash)
    return { status: 'Unknown', tx: { ...cur, hashes: [...ownHashes(cur), result.hash] } }
  const hashes = [...ownHashes(latest).filter((h) => h !== result.hash), result.hash]
  const stillPending = latest.state === 'Pending'
  // Claimed (kind, fees, fee) only when the node took it and the send is still Pending: otherwise the hash alone is recorded.
  // A cancel whose answer was unclear still gets its `kind`, so a receipt for it is read as the cancel (Replaced), not as a send.
  const sent = result.status === 'Pending' && stillPending
  const next: PendingTx = {
    ...latest,
    hashes,
    ...(sent
      ? {
          kind,
          maxFeePerGas: String(plan.maxFeePerGas),
          maxPriorityFeePerGas: String(plan.maxPriorityFeePerGas),
          lastCheckedAt: d.now(),
          // A speed up is the same tx: its gas limit and estimate carry on. A cancel keeps the send's own (it may still be the one that runs).
          ...(cancel ? {} : { gasLimit: String(plan.gasLimit), fee: fromUnits(plan.estimatedFee, 'ETH') }),
        }
      : cancel && stillPending
        ? { kind }
        : {}),
  }
  try {
    d.savePending(next)
  } catch {
    return { status: 'Unknown', tx: next }
  }
  if (sent) return { status: 'Sent', tx: next }
  return result.status === 'Pending' ? { status: 'NotPending' } : { status: 'Unknown', tx: next }
}
