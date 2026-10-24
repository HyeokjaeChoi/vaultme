import type { Hash } from 'viem'

export type SendState =
  | { status: 'Draft' }
  | { status: 'Reviewing'; blocked: boolean; requiresAck: boolean }
  | { status: 'Authenticating'; requiresAck: boolean }
  | { status: 'Submitting'; requiresAck: boolean }
  | { status: 'Pending'; hash: Hash }
  | { status: 'Unknown'; hash: Hash }
  | { status: 'Included'; hash: Hash }
  | { status: 'Confirmed'; hash: Hash }
  | { status: 'Failed'; hash: Hash }
  | { status: 'Replaced'; hash: Hash }

export type SendEvent =
  | { type: 'INPUT_VALID' }
  | { type: 'REVIEW'; requiresAck: boolean }
  | { type: 'EDIT' }
  | { type: 'CONFIRM'; ack: boolean }
  | { type: 'AUTH_OK' }
  | { type: 'AUTH_FAIL' }
  | { type: 'AUTH_CANCEL' }
  | { type: 'FEE_CAP_EXCEEDED' }
  | { type: 'ABS_CAP_EXCEEDED' }
  | { type: 'SUBMITTED'; hash: Hash }
  | { type: 'SUBMIT_UNKNOWN'; hash: Hash }
  | { type: 'RECEIPT'; ok: boolean }
  | { type: 'SAFE'; ok: boolean }
  | { type: 'REORGED' }
  | { type: 'NONCE_PASSED_NO_RECEIPT' }
  | { type: 'TIMEOUT' }

export type InvalidTransitionHook = (state: SendState, event: SendEvent) => void

const hashOf = (s: SendState): Hash | undefined => ('hash' in s ? s.hash : undefined)

/** ARCHITECTURE.md#invariants (transaction state). Unknown transitions return `state` unchanged and call `onInvalid` (never throw). */
export function reduce(state: SendState, event: SendEvent, onInvalid?: InvalidTransitionHook): SendState {
  const next = step(state, event)
  if (next === undefined) {
    onInvalid?.(state, event)
    return state
  }
  return next
}

function step(s: SendState, e: SendEvent): SendState | undefined {
  switch (s.status) {
    case 'Draft':
      if (e.type === 'INPUT_VALID') return s
      if (e.type === 'REVIEW') return { status: 'Reviewing', blocked: false, requiresAck: e.requiresAck }
      return undefined
    case 'Reviewing':
      if (e.type === 'EDIT') return { status: 'Draft' }
      if (e.type === 'CONFIRM' && !s.blocked && (!s.requiresAck || e.ack))
        return { status: 'Authenticating', requiresAck: s.requiresAck }
      return undefined
    case 'Authenticating':
      if (e.type === 'AUTH_OK') return { status: 'Submitting', requiresAck: s.requiresAck }
      if (e.type === 'AUTH_FAIL' || e.type === 'AUTH_CANCEL') return reviewing(s.requiresAck)
      return undefined
    case 'Submitting':
      if (e.type === 'FEE_CAP_EXCEEDED') return reviewing(s.requiresAck)
      if (e.type === 'ABS_CAP_EXCEEDED') return { ...reviewing(s.requiresAck), blocked: true }
      if (e.type === 'SUBMITTED') return { status: 'Pending', hash: e.hash }
      if (e.type === 'SUBMIT_UNKNOWN') return { status: 'Unknown', hash: e.hash }
      return undefined
    case 'Pending':
    case 'Unknown': {
      if (e.type === 'TIMEOUT') return s // no time-based verdict (ADR-0006)
      const hash = hashOf(s)
      if (!hash) return undefined
      // RECEIPT(reverted) is also Included; Failed is decided at `safe`.
      if (e.type === 'RECEIPT') return { status: 'Included', hash }
      if (e.type === 'NONCE_PASSED_NO_RECEIPT') return { status: 'Replaced', hash }
      return undefined
    }
    case 'Included':
      if (e.type === 'SAFE') return { status: e.ok ? 'Confirmed' : 'Failed', hash: s.hash }
      if (e.type === 'REORGED') return { status: 'Pending', hash: s.hash }
      return undefined
    default:
      return undefined // Confirmed, Failed, Replaced are final
  }
}

const reviewing = (requiresAck: boolean): Extract<SendState, { status: 'Reviewing' }> => ({
  status: 'Reviewing',
  blocked: false,
  requiresAck,
})

/** ADR-0006: no new Draft while any send is Pending or Unknown. */
export function canStartDraft(sends: readonly SendState[]): boolean {
  return !sends.some((s) => s.status === 'Pending' || s.status === 'Unknown')
}
