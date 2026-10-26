import { useEffect, useState } from 'react'
import { api } from '@/shared/api'
import { loadInternal, wantsInternal, type Internal } from './internal'

type Settled = Exclude<Internal, { status: 'loading' }>

/**
 * The internal transfers of `hash` (ADR-0015), read apart from the screen's own data: S41 shows the transaction at once and this
 * section has its own loading, list and error. `null` = nothing to read (no hash yet, not a transaction hash, or no API in test-data
 * mode): the section is not drawn. The state belongs to its hash and attempt, so a new hash or a retry shows loading again and a
 * late answer of an older read is dropped. `retry` reads again.
 */
export function useInternalTransfers(hash: string | null): [Internal | null, retry: () => void] {
  const [attempt, setAttempt] = useState(0)
  const [current, setCurrent] = useState<{ hash: string; attempt: number; state: Settled } | null>(null)
  const client = api
  const enabled = hash !== null && wantsInternal(hash) && client !== null

  useEffect(() => {
    if (!enabled) return
    let live = true
    void loadInternal((x) => client.txInternal(x), hash).then((state) => {
      if (live) setCurrent({ hash, attempt, state })
    })
    return () => {
      live = false
    }
  }, [enabled, client, hash, attempt])

  if (!enabled) return [null, () => undefined]
  const shown = current?.hash === hash && current.attempt === attempt ? current.state : ({ status: 'loading' } as const)
  return [shown, () => setAttempt((n) => n + 1)]
}
