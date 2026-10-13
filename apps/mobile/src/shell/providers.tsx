import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { StatusBar } from 'expo-status-bar'
import { i18n } from '@vaultme/i18n'
import { ThemeProvider } from '@/shared/theme'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <StatusBar style="auto" />
        {children}
      </ThemeProvider>
    </I18nextProvider>
  )
}
