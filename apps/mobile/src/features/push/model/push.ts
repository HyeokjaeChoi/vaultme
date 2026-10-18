import { PushData } from '@vaultme/contracts'

/** OS notification permission as the app sees it. */
export type Permission = 'granted' | 'denied' | 'undetermined'

/** The notification APIs the push flow needs. The real one wraps expo-notifications (../notifications.ts); tests pass a fake. */
export type PushPort = {
  permission(): Promise<Permission>
  /** Shows the OS prompt when the permission is still undetermined. */
  request(): Promise<Permission>
  token(projectId: string): Promise<string>
}

export type PushServer = { putPushSubscription(address: string, expoToken: string): Promise<void>; deletePushSubscription(): Promise<void> }

export type PushDeps = {
  /** null = test-data mode (no API): nothing is registered on a server. */
  server: PushServer | null
  port: PushPort
  /** EAS project id; null until `eas init` ran. */
  projectId: string | null
  address(): string | null
  getSetting(): boolean
  setSetting(v: boolean): void
  getUnregisterPending(): boolean
  setUnregisterPending(v: boolean): void
}

/**
 * on = registered (or local-only in test-data mode); denied = the OS refused; unavailable = no wallet or no project id (cannot register here);
 * error = the token or the server call failed.
 */
export type EnableResult = 'on' | 'denied' | 'unavailable' | 'error'

/** S50 "알림 켜기" and the S62 switch. The setting turns on only after the server holds the subscription (#67). */
export async function enablePush(d: PushDeps): Promise<EnableResult> {
  const address = d.address()
  if (!address) return 'unavailable'
  try {
    let p = await d.port.permission()
    if (p === 'undetermined') p = await d.port.request()
    if (p !== 'granted') return 'denied'
    if (d.server) {
      if (!d.projectId) return 'unavailable'
      await d.server.putPushSubscription(address, await d.port.token(d.projectId))
    }
    d.setUnregisterPending(false)
    d.setSetting(true)
    return 'on'
  } catch {
    return 'error'
  }
}

/**
 * S62 switch off, or the wallet was removed. The setting turns off first; a failed server delete is remembered and retried at the next launch.
 * The privacy line promises the server forgets the address and token right away, so a failure is never silent.
 */
export async function disablePush(d: PushDeps): Promise<void> {
  d.setSetting(false)
  if (!d.server) return
  try {
    await d.server.deletePushSubscription()
    d.setUnregisterPending(false)
  } catch {
    d.setUnregisterPending(true)
  }
}

/**
 * At launch: finish a pending delete; when the setting is on, re-send address and token (the Expo token can change) and switch it off
 * if the OS permission is gone. Every failure is silent and retried at the next launch.
 */
export async function syncPush(d: PushDeps): Promise<void> {
  if (!d.server) return
  try {
    if (d.getUnregisterPending()) {
      await d.server.deletePushSubscription()
      d.setUnregisterPending(false)
      return
    }
    if (!d.getSetting()) return
    const address = d.address()
    if (!address || !d.projectId) return
    if ((await d.port.permission()) !== 'granted') return await disablePush(d)
    await d.server.putPushSubscription(address, await d.port.token(d.projectId))
  } catch {
    // retried at the next launch
  }
}

/** A tapped push opens the detail of its transaction. Anything the server contract does not describe is ignored (LLD §12). */
export function routeForPush(data: unknown): string | null {
  const parsed = PushData.safeParse(data)
  return parsed.success ? `/activity/${parsed.data.hash}` : null
}
