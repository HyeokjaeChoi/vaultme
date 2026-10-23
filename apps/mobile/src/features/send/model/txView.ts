import type { ActivityStatus } from '@/shared/ui'
import type { TxState } from './txState'

/** Icon status and i18n label of a send in lists and on S23/S41. Replaced has its own badge (refresh): nothing was executed, nothing went wrong on chain. */
export function txView(state: TxState): {
  status: ActivityStatus
  label: `activity.${'pending' | 'included' | 'confirmed' | 'failed' | 'unknown' | 'replaced'}`
} {
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
      return { status: 'replaced', label: 'activity.replaced' }
    default:
      return { status: 'unknown', label: 'activity.unknown' }
  }
}

/** Notice under the summary on S23/S41, by state. Pending and Unknown are the S23 copy; Unknown is the neutral tone (Figma C3-S41 Unknown 376:1385). */
const NOTICE = {
  Pending: { tone: 'info', title: 'result.sending', body: 'result.pendingBody' },
  Unknown: { tone: 'unknown', title: 'result.unknownTitle', body: 'result.unknownBody' },
  Included: { tone: 'info', title: 'detail.included.title', body: 'detail.included.body' },
  Confirmed: { tone: 'confirmed', title: 'detail.confirmed.title', body: 'detail.confirmed.body' },
  Failed: { tone: 'danger', title: 'detail.failed.title', body: 'detail.failed.body' },
  Replaced: { tone: 'warning', title: 'detail.replaced.title', body: 'detail.replaced.body' },
} as const satisfies Record<
  TxState,
  { tone: 'info' | 'unknown' | 'confirmed' | 'danger' | 'warning'; title: string; body: string }
>

export const txNotice = (state: TxState) => NOTICE[state]

type ResultCopy = {
  tone: 'pending' | 'confirmed' | 'failed' | 'unknown' | 'replaced'
  title: 'result.sending' | 'result.sent' | 'result.failedTitle' | 'result.unknownTitle' | 'result.replacedTitle'
  body:
    | 'result.pendingBody'
    | 'result.includedBody'
    | 'result.unknownBody'
    | 'detail.confirmed.body'
    | 'detail.failed.body'
    | 'detail.replaced.body'
  /** Warning line under the progress: a send that may still go through says not to send again (two lines, Figma S23). */
  warn: 'result.sendAgainWarn' | null
}

/** S23 headline by state (Redesign B): "보내는 중이에요" while Pending or Included, "보냈어요" only when Confirmed. */
const RESULT: Record<TxState, ResultCopy> = {
  Pending: { tone: 'pending', title: 'result.sending', body: 'result.pendingBody', warn: 'result.sendAgainWarn' },
  Included: { tone: 'pending', title: 'result.sending', body: 'result.includedBody', warn: 'result.sendAgainWarn' },
  Confirmed: { tone: 'confirmed', title: 'result.sent', body: 'detail.confirmed.body', warn: null },
  Failed: { tone: 'failed', title: 'result.failedTitle', body: 'detail.failed.body', warn: null },
  Unknown: { tone: 'unknown', title: 'result.unknownTitle', body: 'result.unknownBody', warn: null },
  Replaced: { tone: 'replaced', title: 'result.replacedTitle', body: 'detail.replaced.body', warn: null },
}

export const resultCopy = (state: TxState): ResultCopy => RESULT[state]

/** S40 row title key (Redesign B): direction plus progress. Received rows are always Confirmed (no incoming pending row). */
export function rowTitleKey(kind: 'send' | 'receive', label: ReturnType<typeof txView>['label']) {
  switch (label) {
    case 'activity.pending':
    case 'activity.included':
      return 'activity.row.sending'
    case 'activity.confirmed':
      return kind === 'send' ? 'activity.row.sent' : 'activity.row.received'
    case 'activity.failed':
      return 'activity.row.failed'
    case 'activity.replaced':
      return 'activity.row.replaced'
    default:
      return 'activity.row.unknown'
  }
}
