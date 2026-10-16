import type { ActivityStatus } from '@/shared/ui'
import type { TxState } from './txState'

/** Icon status and i18n label of a send in lists and on S23/S41. Replaced is neutral: nothing was executed, nothing went wrong on chain. */
export function txView(state: TxState): { status: ActivityStatus; label: `activity.${'pending' | 'included' | 'confirmed' | 'failed' | 'unknown' | 'replaced'}` } {
  switch (state) {
    case 'Pending':
      return { status: 'pending', label: 'activity.pending' }
    case 'Included':
      return { status: 'pending', label: 'activity.included' }
    case 'Confirmed':
      return { status: 'confirmed', label: 'activity.confirmed' }
    case 'Failed':
      return { status: 'failed', label: 'activity.failed' }
    case 'Replaced':
      return { status: 'unknown', label: 'activity.replaced' }
    default:
      return { status: 'unknown', label: 'activity.unknown' }
  }
}

/** Notice under the summary on S23/S41, by state. Pending and Unknown are the S23 copy; Unknown is the neutral tone (Figma C3-S41 Unknown 376:1385). */
const NOTICE = {
  Pending: { tone: 'info', title: 'result.title', body: 'result.body' },
  Unknown: { tone: 'unknown', title: 'result.unknownTitle', body: 'result.unknownBody' },
  Included: { tone: 'info', title: 'detail.included.title', body: 'detail.included.body' },
  Confirmed: { tone: 'confirmed', title: 'detail.confirmed.title', body: 'detail.confirmed.body' },
  Failed: { tone: 'danger', title: 'detail.failed.title', body: 'detail.failed.body' },
  Replaced: { tone: 'warning', title: 'detail.replaced.title', body: 'detail.replaced.body' },
} as const satisfies Record<TxState, { tone: 'info' | 'unknown' | 'confirmed' | 'danger' | 'warning'; title: string; body: string }>

export const txNotice = (state: TxState) => NOTICE[state]

type ResultCopy = {
  tone: 'pending' | 'confirmed' | 'failed' | 'unknown' | 'replaced'
  title: 'result.sending' | 'result.sent' | 'result.failedTitle' | 'result.unknownTitle' | 'result.replacedTitle'
  body: 'result.pendingBody' | 'result.includedBody' | 'detail.confirmed.body' | 'detail.failed.body' | 'detail.replaced.body' | null
  /** Warning notice under the headline: a send that may still go through says not to send again. */
  warn: 'result.body' | 'result.includedWarn' | 'result.unknownBody' | null
}

/** S23 headline by state (ux-copy.md "Redesign B 수정안"): "보내는 중이에요" while Pending or Included, "보냈어요" only when Confirmed. */
const RESULT: Record<TxState, ResultCopy> = {
  Pending: { tone: 'pending', title: 'result.sending', body: 'result.pendingBody', warn: 'result.body' },
  Included: { tone: 'pending', title: 'result.sending', body: 'result.includedBody', warn: 'result.includedWarn' },
  Confirmed: { tone: 'confirmed', title: 'result.sent', body: 'detail.confirmed.body', warn: null },
  Failed: { tone: 'failed', title: 'result.failedTitle', body: 'detail.failed.body', warn: null },
  Unknown: { tone: 'unknown', title: 'result.unknownTitle', body: null, warn: 'result.unknownBody' },
  Replaced: { tone: 'replaced', title: 'result.replacedTitle', body: 'detail.replaced.body', warn: null },
}

export const resultCopy = (state: TxState): ResultCopy => RESULT[state]
