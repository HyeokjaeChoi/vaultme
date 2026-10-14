import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import { Providers } from '@/shell/providers'
import { useTheme } from '@/shared/theme'
import { fontAssets, textStyle } from '@/shared/theme/fonts'

function Navigator() {
  const th = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: th.semantic.surface.canvas },
        headerTintColor: th.semantic.text.primary,
        headerTitleStyle: { ...textStyle(th.semantic.typography.section), color: th.semantic.text.primary },
        contentStyle: { backgroundColor: th.semantic.surface.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="precheck" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="send/index" options={{ headerShown: false }} />
      <Stack.Screen name="send/amount" options={{ headerShown: false }} />
      <Stack.Screen name="receive" options={{ headerShown: false }} />
      <Stack.Screen name="review" options={{ headerShown: false }} />
      <Stack.Screen name="kit" options={{ title: 'Kit' }} />
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
