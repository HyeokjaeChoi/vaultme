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

export type PushNav = {
  navigate(href: '/activity'): void
  push(href: { pathname: '/activity/[hash]'; params: { hash: string; dir: 'in' | 'out' } }): void
}

/**
 * A tapped push opens S41 of the pushed transaction with the 내역 list below it, at once (owner decision, #171): no fetch, no wait.
 * S41 looks the bare hash up itself (cache, then a fresh page), among the rows of the pushed direction. Anything the server contract does not describe is ignored (returns false).
 */
export function openPush(data: unknown, nav: PushNav): boolean {
  const p = PushData.safeParse(data)
  if (!p.success) return false
  nav.navigate('/activity')
  // `dir`: one tx can have an `in` and an `out` row (and push both kinds); S41 shows the row of the pushed direction.
  nav.push({
    pathname: '/activity/[hash]',
    params: { hash: p.data.hash, dir: p.data.kind === 'deposit' ? 'in' : 'out' },
  })
  return true
}
