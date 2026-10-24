import { getPendingTx, setPendingTx, type PendingTx } from '@/shared/storage'

// A submitted tx whose kv write failed. It keeps the ADR-0006 block and the result screen alive until the app restarts.
let unsaved: PendingTx | null = null

/** Writes the kv record. If the write fails the tx is kept in memory, so a submitted send is never forgotten (ADR-0006). */
export function writePendingTx(tx: PendingTx | null): void {
  try {
    setPendingTx(tx)
    unsaved = null
  } catch (e) {
    if (tx === null) throw e
    unsaved = tx
  }
}

/** Reads the kv record (or the unsaved one); a corrupt or unreadable one is `'corrupt'` so the send block stays on (ADR-0006). */
export function readPendingTx(): PendingTx | null | 'corrupt' {
  try {
    return getPendingTx() ?? unsaved
  } catch {
    return unsaved ?? 'corrupt'
  }
}
