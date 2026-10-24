import { PushData } from '@vaultme/contracts'

/** OS notification permission as the app sees it. */
export type Permission = 'granted' | 'denied' | 'undetermined'

/** The notification APIs the push flow needs. The real one wraps expo-notifications (../api/notifications.ts); tests pass a fake. */
export type PushPort = {
  permission(): Promise<Permission>
  /** Shows the OS prompt when the permission is still undetermined. */
  request(): Promise<Permission>
  token(projectId: string): Promise<string>
}

export type PushServer = {
  putPushSubscription(address: string, expoToken: string): Promise<void>
  deletePushSubscription(): Promise<void>
}

export type PushDeps = {
  /** null = test-data mode (no API): nothing is registered on a server. */
  server: PushServer | null
  port: PushPort
  /** EAS project id; null until `eas init` ran. */
  projectId: string | null
  address(): string | null
  getSetting(): boolean
  setSetting(v: boolean): void
  /** The server may still hold this install's subscription: a DELETE is owed. */
  getUnregisterPending(): boolean
  setUnregisterPending(v: boolean): void
}

/**
 * on = registered (or local-only in test-data mode); denied = the OS refused; unavailable = no wallet or no project id (cannot register here);
 * error = the token or the server call failed.
 */
export type EnableResult = 'on' | 'denied' | 'unavailable' | 'error'

// One push operation at a time: a launch sync that is still waiting for a token must not re-register after the user switched off (#67 decision 7).
let queue: Promise<unknown> = Promise.resolve()
function serial<T>(op: () => Promise<T>): Promise<T> {
  const next = queue.then(op, op)
  queue = next.catch(() => undefined)
  return next
}

/**
 * S50 "알림 켜기" and the S62 switch. The setting turns on only after the server holds the subscription (#67).
 * A DELETE is owed from before the PUT until it succeeds, so a PUT whose answer was lost is undone at the next launch.
 */
export function enablePush(d: PushDeps): Promise<EnableResult> {
  return serial(async () => {
    try {
      const address = d.address()
      if (!address) return 'unavailable'
      let p = await d.port.permission()
      if (p === 'undetermined') p = await d.port.request()
      if (p !== 'granted') return 'denied'
      if (d.server) {
        if (!d.projectId) return 'unavailable'
        const token = await d.port.token(d.projectId)
        d.setUnregisterPending(true)
        await d.server.putPushSubscription(address, token)
      }
      d.setUnregisterPending(false)
      d.setSetting(true)
      return 'on'
    } catch {
      return 'error'
    }
  })
}

/**
 * S62 switch off, or the wallet was removed. The setting turns off and the DELETE is recorded as owed before it is sent;
 * a failed or interrupted DELETE is retried at the next launch. The privacy line promises the server forgets the address and token right away.
 */
export function disablePush(d: PushDeps): Promise<void> {
  return serial(async () => {
    try {
      d.setSetting(false)
      if (!d.server) return
      d.setUnregisterPending(true)
      await d.server.deletePushSubscription()
      d.setUnregisterPending(false)
    } catch {
      // still owed (or kv unavailable): retried at the next launch
    }
  })
}

/**
 * At launch: finish an owed delete; when the setting is on, re-send address and token (the Expo token can change) and switch it off
 * if the OS permission is gone. Every failure is silent and retried at the next launch.
 */
export function syncPush(d: PushDeps): Promise<void> {
  return serial(async () => {
    if (!d.server) return
    try {
      if (d.getUnregisterPending()) {
        await d.server.deletePushSubscription()
        d.setUnregisterPending(false)
        d.setSetting(false)
        return
      }
      if (!d.getSetting()) return
      const address = d.address()
      if (!address || !d.projectId) return
      if ((await d.port.permission()) !== 'granted') {
        d.setSetting(false)
        d.setUnregisterPending(true)
        await d.server.deletePushSubscription()
        d.setUnregisterPending(false)
        return
      }
      await d.server.putPushSubscription(address, await d.port.token(d.projectId))
    } catch {
      // retried at the next launch
    }
  })
}

/** What `router.push` takes: the list, or S41 of one row. */
export type PushRoute = '/activity' | { pathname: '/activity/[hash]'; params: { hash: string } }

export type PushTapDeps = {
  address(): string | null
  /**
   * Ids (`<hash>:<seq>`) of the rows with this hash in a FRESH first page of the history, which the call also writes to the history cache
   * (S41 reads its row from there). Rejects when the page is not fresh. null = test-data mode (no API).
   */
  rowIdsForHash: ((address: string, hash: string) => Promise<string[]>) | null
  detailRoute(row: { id: string }): PushRoute
  /** Longest wait for the page. Short on purpose: the tap shows nothing while it waits, and the list is a fine answer. */
  timeoutMs: number
}

/**
 * A tapped push opens S41 of the pushed transaction when a fresh history page holds exactly one row with its hash (owner decision, #171).
 * The pushed tx is usually not in the cached page, so the page is fetched at tap time. Zero or several rows, and every failure
 * (error, timeout, no address, test-data mode, update_required) open the 내역 list. Null = the payload is not a push of this app: do nothing.
 */
export async function routeForPush(data: unknown, d: PushTapDeps): Promise<PushRoute | null> {
  const p = PushData.safeParse(data)
  if (!p.success) return null
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const address = d.address()
    if (!address || !d.rowIdsForHash) return '/activity'
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('push tap: history timeout')), d.timeoutMs)
    })
    const ids = await Promise.race([d.rowIdsForHash(address, p.data.hash), timeout])
    const [only] = ids
    return ids.length === 1 && only ? d.detailRoute({ id: only }) : '/activity'
  } catch {
    return '/activity'
  } finally {
    clearTimeout(timer)
  }
}
