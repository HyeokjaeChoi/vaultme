import { useEffect, type ReactNode } from 'react'
import { AppState, Platform, type AppStateStatus } from 'react-native'
import { I18nextProvider } from 'react-i18next'
import { NavigationBar } from 'expo-navigation-bar'
import { StatusBar } from 'expo-status-bar'
import { focusManager } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { getLocales } from 'expo-localization'
import { i18n, pickLanguage } from '@vaultme/i18n'
import { queryClient, persistOptions } from '@/shared/query'
import { queryStorage } from '@/shared/storage'
import { ThemeProvider } from '@/shared/theme'
import { UpdateGate } from './UpdateGate'

// App language = the first supported device language, else ko (ADR-0037). Read at start and again when the app comes back to
// the foreground: iOS restarts the app on a language change, Android per-app language may not recreate the activity.
const applyDeviceLanguage = () => void i18n.changeLanguage(pickLanguage(getLocales().map((l) => l.languageCode)))
applyDeviceLanguage()

// The cache lives in the encrypted MMKV (ADR-0004, ADR-0021). `Providers` renders only after `openKv()` resolved (RootLayout), so the storage is open.
const persist = persistOptions(queryStorage)

// TanStack Query docs (React Native): the app coming back to `active` counts as window focus, so active stale queries refetch.
const onAppStateChange = (status: AppStateStatus) => {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active')
  if (status === 'active') applyDeviceLanguage()
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange)
    return () => sub.remove()
  }, [])
  return (
    <I18nextProvider i18n={i18n}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persist}>
        <ThemeProvider>
          <StatusBar style="auto" />
          {/* Button colour follows the system theme; the plugin's enforceContrast:false (app.json) removes the grey scrim. */}
          <NavigationBar style="auto" />
          <UpdateGate>{children}</UpdateGate>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </I18nextProvider>
  )
}
