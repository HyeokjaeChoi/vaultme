import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular' // per-weight subpath: the package root would bundle all weights
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium'
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold'

import PretendardRegular from 'pretendard/dist/public/static/Pretendard-Regular.otf'
import PretendardMedium from 'pretendard/dist/public/static/Pretendard-Medium.otf'
import PretendardSemiBold from 'pretendard/dist/public/static/Pretendard-SemiBold.otf'
import PretendardBold from 'pretendard/dist/public/static/Pretendard-Bold.otf'

/** Passed to expo-font `useFonts`. Redesign B: Pretendard 400/500/600 and 700 (figures only; OFL-1.1), IBM Plex Mono 400/500. */
export const fontAssets = {
  Pretendard_400Regular: PretendardRegular,
  Pretendard_500Medium: PretendardMedium,
  Pretendard_600SemiBold: PretendardSemiBold,
  Pretendard_700Bold: PretendardBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
}

const PRETENDARD = {
  '400': 'Pretendard_400Regular',
  '500': 'Pretendard_500Medium',
  '600': 'Pretendard_600SemiBold',
  '700': 'Pretendard_700Bold',
} as const
const MONO = {
  '400': 'IBMPlexMono_400Regular',
  '500': 'IBMPlexMono_500Medium',
  '600': 'IBMPlexMono_600SemiBold',
} as const

type Typo = { fontFamily: string; fontWeight: string; fontSize: number; lineHeight: number; letterSpacing: number }

/** Custom fonts have one file per weight, so the weight is part of fontFamily (no fontWeight). 700 is only for the Figure style (balances and amounts); weights clamp to 400-700. Digits are tabular for amounts. */
export function textStyle({ fontFamily, fontWeight, fontSize, lineHeight, letterSpacing }: Typo) {
  const w = Number(fontWeight)
  const mono = fontFamily === 'IBM Plex Mono'
  const family = mono
    ? MONO[w >= 600 ? '600' : w >= 500 ? '500' : '400']
    : PRETENDARD[String(Math.min(Math.max(Math.round(w / 100) * 100, 400), 700)) as keyof typeof PRETENDARD]
  return { fontFamily: family, fontSize, lineHeight, letterSpacing }
}

export const TABULAR = { fontVariant: ['tabular-nums' as const] }
