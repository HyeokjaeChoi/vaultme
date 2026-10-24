import type { PushTapDeps } from '@/features/push'
import { detailRoute, freshRowIdsForHash } from '@/features/history'
import { getAccountAddress } from '@/shared/storage'

/**
 * Tap route of a push (ARCHITECTURE.md#transaction-push). The shell joins the two features: push may not import history.
 * 3 s: a tap shows nothing while it waits, and the list is the fallback.
 */
export const pushTapDeps: PushTapDeps = {
  address: getAccountAddress,
  rowIdsForHash: freshRowIdsForHash,
  detailRoute,
  timeoutMs: 3000,
}
