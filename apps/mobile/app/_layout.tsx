import '@/shared/lib/crypto-polyfill' // must stay first: wallet-core (via @noble) reads globalThis.crypto at import time
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import { Providers } from '@/shell/providers'
import { useTheme } from '@/shared/theme'
import { fontAssets } from '@/shared/theme/fonts'
import { openKv } from '@/shared/storage'

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
  useEffect(() => {
    // The encrypted kv (backup flag, lock state) must be open before any screen reads it.
    openKv().then(() => setKvReady(true), () => setKvReady(true)) // ponytail: a failed open still renders; kv readers then throw. Real boot-error screen belongs to the lock gate.
  }, [])
  if ((!loaded && !error) || !kvReady) return null // fonts are bundled; this is one frame
  return (
    <Providers>
      <Navigator />
    </Providers>
  )
}
