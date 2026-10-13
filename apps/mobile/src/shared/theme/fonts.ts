// Per-weight subpath imports: the package root would bundle all 18 weights.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular'
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium'

/** Passed to expo-font `useFonts`. Foundation: Inter 400/500/600/700, IBM Plex Mono 400/500. */
export const fontAssets = { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, IBMPlexMono_400Regular, IBMPlexMono_500Medium }

const INTER = { '400': 'Inter_400Regular', '500': 'Inter_500Medium', '600': 'Inter_600SemiBold', '700': 'Inter_700Bold' } as const
const MONO = { '400': 'IBMPlexMono_400Regular', '500': 'IBMPlexMono_500Medium' } as const

type Typo = { fontFamily: string; fontWeight: string; fontSize: number; lineHeight: number; letterSpacing: number }

/** Custom fonts have one file per weight, so the weight is part of fontFamily (no fontWeight). */
export function textStyle({ fontFamily, fontWeight, fontSize, lineHeight, letterSpacing }: Typo) {
  const w = Number(fontWeight)
  const family = fontFamily === 'IBM Plex Mono' ? MONO[w >= 500 ? '500' : '400'] : INTER[String(Math.min(Math.max(Math.round(w / 100) * 100, 400), 700)) as keyof typeof INTER]
  return { fontFamily: family, fontSize, lineHeight, letterSpacing }
}
