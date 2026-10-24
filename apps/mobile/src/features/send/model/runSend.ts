import { fromUnits, signAndSubmit, type Address, type ApprovedSend } from '@vaultme/wallet-core'
import { ACCOUNT_INDEX } from '@/entities/account'
import type { ChainPort } from '@/shared/chain'
import type { AuthPrompt, LoadPhraseResult, PendingTx } from '@/shared/storage'

/** ADR-0006: a Pending or Unknown send blocks a new one. A corrupt record must not lift the block. */
export const blocksNewSend = (tx: PendingTx | null | 'corrupt'): boolean =>
  tx === 'corrupt' || (tx !== null && (tx.state === 'Pending' || tx.state === 'Unknown'))

export type SendOutcome =
  | { status: 'Pending' | 'Unknown'; tx: PendingTx }
  | { status: 'NeedsReview' | 'Blocked' | 'Cancelled' | 'AuthError' | 'PendingExists' }
  /** `error` = what the network call threw (an ApiError says why: offline, busy, clock). */
  | { status: 'ChainError'; error: unknown }

export type SendDeps = {
  chain: Pick<ChainPort, 'getSnapshot' | 'submit' | 'broadcasts'>
  loadPhrase: (prompt: AuthPrompt) => Promise<LoadPhraseResult>
  readPending: () => PendingTx | null | 'corrupt'
  savePending: (tx: PendingTx) => void
  now: () => number
  prompt: AuthPrompt
}

/**
 * Per-send flow after the user confirmed Review: OS auth (the phrase read IS the auth, ADR-0004) -> fresh snapshot -> signAndSubmit.
 * Cancel signs nothing. The phrase is only referenced inside this function.
 * `amount` is the decimal string the user entered; `from` is the sending account address.
 */
export async function runSend(
  approved: ApprovedSend,
  amount: string,
  from: Address,
  d: SendDeps,
): Promise<SendOutcome> {
  if (blocksNewSend(d.readPending())) return { status: 'PendingExists' }

  const auth = await d.loadPhrase(d.prompt)
  if (auth.status === 'cancelled') return { status: 'Cancelled' }
  if (auth.status === 'error') return { status: 'AuthError' }

  let result
  try {
    const latest = await d.chain.getSnapshot(from, approved.asset, approved.to, amount)
    result = await signAndSubmit(approved, latest, { mnemonic: auth.mnemonic, submit: (raw) => d.chain.submit(raw) })
  } catch (error) {
    return { status: 'ChainError', error }
  }
  if (result.status === 'NeedsReview' || result.status === 'Blocked') return { status: result.status }

  const at = d.now()
  const tx: PendingTx = {
    hash: result.hash,
    nonce: approved.nonce,
    asset: approved.asset,
    to: approved.to,
    amount,
    createdAt: at,
    lastCheckedAt: at,
    fee: fromUnits(approved.estimatedFee, 'ETH'),
    accountIndex: ACCOUNT_INDEX,
    state: result.status,
  }
  try {
    d.savePending(tx)
  } catch {
    // Submitted but not recorded: report Unknown, never a clean failure (ADR-0006).
    return { status: 'Unknown', tx: { ...tx, state: 'Unknown' } }
  }
  return { status: result.status, tx }
}
