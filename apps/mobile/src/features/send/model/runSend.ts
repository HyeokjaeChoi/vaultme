import { fromUnits, signAndSubmit, type Address, type ApprovedSend } from '@vaultme/wallet-core'
import type { ChainPort } from '@/shared/chain/port'
import type { AuthPrompt, LoadPhraseResult, PendingTx } from '@/shared/storage'

/** Q47: a Pending or Unknown send blocks a new one. A corrupt record must not lift the block. */
export const blocksNewSend = (tx: PendingTx | null | 'corrupt'): boolean => tx === 'corrupt' || (tx !== null && (tx.state === 'Pending' || tx.state === 'Unknown'))

export type SendOutcome =
  | { status: 'Pending' | 'Unknown'; tx: PendingTx }
  | { status: 'NeedsReview' | 'Blocked' | 'Cancelled' | 'AuthError' | 'ChainError' | 'PendingExists' }

export type SendDeps = {
  chain: ChainPort
  loadPhrase: (prompt: AuthPrompt) => Promise<LoadPhraseResult>
  readPending: () => PendingTx | null | 'corrupt'
  savePending: (tx: PendingTx) => void
  now: () => number
  prompt: AuthPrompt
}

/**
 * Per-send flow after the user confirmed Review: OS auth (the phrase read IS the auth, Q12) -> fresh snapshot -> signAndSubmit.
 * Cancel signs nothing. The phrase is only referenced inside this function.
 * `amount` is the decimal string the user entered; `from` is the sending account address.
 */
export async function runSend(approved: ApprovedSend, amount: string, from: Address, d: SendDeps): Promise<SendOutcome> {
  if (blocksNewSend(d.readPending())) return { status: 'PendingExists' }

  const auth = await d.loadPhrase(d.prompt)
  if (auth.status === 'cancelled') return { status: 'Cancelled' }
  if (auth.status === 'error') return { status: 'AuthError' }

  let result
  try {
    const latest = await d.chain.getSnapshot(from, approved.asset, approved.to, amount)
    result = await signAndSubmit(approved, latest, { mnemonic: auth.mnemonic, submit: (raw) => d.chain.submit(raw) })
  } catch {
    return { status: 'ChainError' }
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
    state: result.status,
  }
  d.savePending(tx)
  return { status: result.status, tx }
}
