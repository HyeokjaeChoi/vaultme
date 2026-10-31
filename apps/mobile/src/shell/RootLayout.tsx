import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import { Providers } from './providers'
import { fontAssets, useTheme } from '@/shared/theme'
import { initAppStore } from '@/shared/app-store'
import { hasPhrase, openKv } from '@/shared/storage'
import { LockGate } from './LockGate'
import { usePushBoot } from '@/features/push'

function Navigator() {
  const th = useTheme()
  usePushBoot()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: th.component.screenB.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="send/result" options={{ gestureEnabled: false }} />
      <Stack.Screen name="send/scan" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  )
}

/** Root layout of the expo-router tree (app/_layout.tsx renders it). */
export function RootLayout() {
  const [loaded, error] = useFonts(fontAssets)
  const [kvReady, setKvReady] = useState(false)
  useEffect(() => {
    // The encrypted kv must be open, and the app store hydrated from it, before any screen reads it. On failure the gate stays closed.
    // ponytail: blank screen on a failed open; a boot-error screen belongs to the lock gate.
    openKv()
      .then(() => hasPhrase().catch(() => true)) // phrase without an address (interrupted creation) counts as a wallet; a failed lookup fails closed (locked)
      .then(
        (has) => {
          initAppStore({ phraseStored: has }) // sync hydration from the kv, before the first render of the gate
          setKvReady(true)
        },
        () => undefined,
      )
  }, [])
  if ((!loaded && !error) || !kvReady) return null // fonts are bundled; this is one frame
  return (
    <Providers>
      <LockGate>
        <Navigator />
      </LockGate>
    </Providers>
  )
}
