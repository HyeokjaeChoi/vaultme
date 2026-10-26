import { readInternalTransfers, type InternalTransfer } from '@vaultme/api-client'
import { i18n } from '@vaultme/i18n'
import { showAmount } from '@/shared/lib/amount'
import { shortAddress } from '@/shared/lib/address'
import { fromUnits } from '@vaultme/wallet-core'

/** `failed`: the read did not work (network, API, a bad answer, a build too old, no answer in time). It only affects the section, never the screen. */
export type Internal = { status: 'loading' } | { status: 'failed' } | { status: 'ok'; items: InternalTransfer[] }

/** The API client has no deadline of its own: a read that never answers is a failed section after this long (owner decision Q4, #239). */
export const INTERNAL_DEADLINE_MS = 10_000

type Settled = Exclude<Internal, { status: 'loading' }>

/** The state to show: an answer counts only for the hash and attempt it was read for, anything else (a new hash, a retry) is loading again. */
export type InternalAnswer = { hash: string; attempt: number; state: Settled }
export const shownInternal = (answer: InternalAnswer | null, hash: string, attempt: number): Internal =>
  answer?.hash === hash && answer.attempt === attempt ? answer.state : { status: 'loading' }

/** Only a real transaction hash is read (a row id such as `dev:0` or an example row is not one). */
export const wantsInternal = (hash: string): boolean => /^0x[0-9a-fA-F]{64}$/.test(hash)

/** Reads the internal ETH transfers of `hash` (ADR-0015). Never throws: any failure is `failed`, which the section shows with a retry. */
export async function loadInternal(txInternal: (hash: string) => Promise<unknown>, hash: string): Promise<Settled> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('internal transfers: no answer')), INTERNAL_DEADLINE_MS)
    })
    return { status: 'ok', items: await Promise.race([readInternalTransfers(txInternal, hash), deadline]) }
  } catch {
    return { status: 'failed' }
  } finally {
    clearTimeout(timer)
  }
}

/** Display of one internal transfer. A failed one moved nothing: its title says so and its amount is grey (history rows do the same). A contract creation has no recipient. */
export function internalRow(i: InternalTransfer) {
  return {
    title: i.ok ? ('detail.internal.row' as const) : ('detail.internal.rowFailed' as const),
    detail: `${shortAddress(i.from)} → ${i.to ? shortAddress(i.to) : '—'}`,
    amount: showAmount(fromUnits(i.value, 'ETH'), 'ETH', 'exact'),
    ok: i.ok,
  }
}

/** What a screen reader hears when a retry (attempt > 0) is answered; null = nothing (the first read, or an empty list that hides the section). */
export const retryAnnouncement = (state: Settled, attempt: number): string | null =>
  attempt === 0 || (state.status === 'ok' && state.items.length === 0)
    ? null
    : state.status === 'failed'
      ? i18n.t('detail.internal.failed')
      : i18n.t('detail.internal.loaded', { n: state.items.length })
