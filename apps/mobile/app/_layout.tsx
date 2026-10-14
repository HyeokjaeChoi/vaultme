import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import { Providers } from '@/shell/providers'
import { useTheme } from '@/shared/theme'
import { fontAssets } from '@/shared/theme/fonts'

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
  if (!loaded && !error) return null // fonts are bundled; this is one frame
  return (
    <Providers>
      <Navigator />
    </Providers>
  )
}
