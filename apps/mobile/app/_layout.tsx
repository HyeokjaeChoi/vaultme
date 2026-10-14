import '@/shared/lib/crypto-polyfill' // must stay first: wallet-core (via @noble) reads globalThis.crypto at import time
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import { Providers } from '@/shell/providers'
import { useTheme } from '@/shared/theme'
import { fontAssets } from '@/shared/theme/fonts'
import { hasPhrase, openKv } from '@/shared/storage'
import { LockGate } from '@/shell/LockGate'

function Navigator() {
  const th = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: th.semantic.surface.canvas },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
    </Stack>
  )
}

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets)
  const [kvReady, setKvReady] = useState(false)
  const [phraseStored, setPhraseStored] = useState(false)
  useEffect(() => {
    // The encrypted kv (backup flag, lock state) must be open before any screen reads it. On failure the gate stays closed.
    // ponytail: blank screen on a failed open; a boot-error screen belongs to the lock gate.
    openKv()
      .then(() => hasPhrase().catch(() => false)) // phrase without an address (interrupted creation) still counts as a wallet for the lock
      .then((has) => {
        setPhraseStored(has)
        setKvReady(true)
      }, () => undefined)
  }, [])
  if ((!loaded && !error) || !kvReady) return null // fonts are bundled; this is one frame
  return (
    <Providers>
      <LockGate phraseStored={phraseStored}>
        <Navigator />
      </LockGate>
    </Providers>
  )
}
