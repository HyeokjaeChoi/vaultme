import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { NavigationBar } from 'expo-navigation-bar'
import { StatusBar } from 'expo-status-bar'
import { i18n } from '@vaultme/i18n'
import { ThemeProvider } from '@/shared/theme'
import { UpdateGate } from './UpdateGate'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <StatusBar style="auto" />
        {/* Button colour follows the system theme; the plugin's enforceContrast:false (app.json) removes the grey scrim. */}
        <NavigationBar style="auto" />
        <UpdateGate>{children}</UpdateGate>
      </ThemeProvider>
    </I18nextProvider>
  )
}
