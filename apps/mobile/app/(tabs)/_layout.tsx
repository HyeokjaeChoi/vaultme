import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { ProductNavigation, type IconName } from '@/shared/ui'

const TAB_ICON: Record<string, IconName> = { home: 'assets', activity: 'activity', settings: 'settings' }

// Tab switch has no animation (prototype rule). The bar is the shared C21 Product navigation.
export default function TabsLayout() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <Tabs
      tabBar={({ state, descriptors, navigation }) => (
        <ProductNavigation
          items={state.routes.map((r, i) => ({
            key: r.key,
            label: String(descriptors[r.key]?.options.title ?? r.name),
            icon: TAB_ICON[r.name] ?? 'assets',
            active: state.index === i,
            onPress: () => navigation.navigate(r.name),
          }))}
        />
      )}
      screenOptions={{ headerShown: false, animation: 'none', sceneStyle: { backgroundColor: th.semantic.surface.canvas } }}
    >
      <Tabs.Screen name="home" options={{ title: t('tab.assets') }} />
      <Tabs.Screen name="activity" options={{ title: t('tab.activity') }} />
      <Tabs.Screen name="settings" options={{ title: t('tab.settings') }} />
    </Tabs>
  )
}
