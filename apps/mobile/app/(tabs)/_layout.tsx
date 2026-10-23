import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { ProductNavigation, type BoldIconName } from '@/shared/ui'

const TAB_ICON: Record<string, BoldIconName> = { home: 'assets', activity: 'activity', settings: 'settings' }

// Tab switch has no animation (prototype rule). The bar is the shared C21 Product navigation.
export default function TabsLayout() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <Tabs
      tabBar={({ state, descriptors, navigation }) => (
        <ProductNavigation
          items={state.routes
            .filter((r) => r.name !== 'asset')
            .map((r) => ({
              key: r.key,
              label: descriptors[r.key]?.options.title ?? r.name,
              icon: TAB_ICON[r.name] ?? 'assets',
              active:
                state.routes[state.index]?.name === 'asset'
                  ? r.name === 'home'
                  : state.routes[state.index]?.key === r.key,
              onPress: () => navigation.navigate(r.name),
            }))}
        />
      )}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: th.semantic.surface.canvas },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tab.assets') }} />
      <Tabs.Screen name="activity" options={{ title: t('tab.activity') }} />
      <Tabs.Screen name="settings" options={{ title: t('tab.settings') }} />
      <Tabs.Screen name="asset" options={{ href: null }} />
    </Tabs>
  )
}
