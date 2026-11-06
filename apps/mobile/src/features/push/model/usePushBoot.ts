import { usePathname, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { i18n } from '@vaultme/i18n'
import { installForegroundHandler, onPushTap, pushDeps } from '../api/notifications'
import { launchDone, openPush, syncPush } from './push'

/** Mounted once in the root navigator (kv is open; the lock gate hides the app until unlock): foreground handler, launch and language-change sync, tap route. */
export function usePushBoot(): void {
  const router = useRouter()
  const launched = launchDone(usePathname())
  useEffect(() => {
    installForegroundHandler()
    void syncPush(pushDeps)
    // Android per-app language can change without a restart: re-send so the push text follows (ADR-0038). Emitted only on a real change (shell/providers).
    const resync = () => void syncPush(pushDeps)
    i18n.on('languageChanged', resync)
    return () => i18n.off('languageChanged', resync)
  }, [])
  // Cold start: wait for the `/` → `/home` redirect, else it replaces the opened list (#177). The tap stays in the OS until then.
  useEffect(() => (launched ? onPushTap((data) => void openPush(data, router)) : undefined), [launched, router])
}
