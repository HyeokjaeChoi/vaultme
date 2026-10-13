import { createContext, useContext, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { dark, light, type Theme } from '@vaultme/tokens'

// Dark follows the OS (Q80). No in-app toggle.
const ThemeContext = createContext<Theme>(light)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  return <ThemeContext value={scheme === 'dark' ? dark : light}>{children}</ThemeContext>
}

export const useTheme = () => useContext(ThemeContext)
export const useIsDark = () => useColorScheme() === 'dark'
