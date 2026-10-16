import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular' // per-weight subpath: the package root would bundle all weights
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium'

import PretendardRegular from 'pretendard/dist/public/static/Pretendard-Regular.otf'
import PretendardMedium from 'pretendard/dist/public/static/Pretendard-Medium.otf'
import PretendardSemiBold from 'pretendard/dist/public/static/Pretendard-SemiBold.otf'

/** Passed to expo-font `useFonts`. Redesign B: Pretendard 400/500/600 (OFL-1.1, no 700), IBM Plex Mono 400/500. */
export const fontAssets = {
  Pretendard_400Regular: PretendardRegular,
  Pretendard_500Medium: PretendardMedium,
  Pretendard_600SemiBold: PretendardSemiBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
}

const PRETENDARD = { '400': 'Pretendard_400Regular', '500': 'Pretendard_500Medium', '600': 'Pretendard_600SemiBold' } as const
const MONO = { '400': 'IBMPlexMono_400Regular', '500': 'IBMPlexMono_500Medium' } as const

type Typo = { fontFamily: string; fontWeight: string; fontSize: number; lineHeight: number; letterSpacing: number }

/** Custom fonts have one file per weight, so the weight is part of fontFamily (no fontWeight). Weights outside 400-600 clamp (Pretendard 700 is not shipped). Digits are tabular for amounts. */
export function textStyle({ fontFamily, fontWeight, fontSize, lineHeight, letterSpacing }: Typo) {
  const w = Number(fontWeight)
  const mono = fontFamily === 'IBM Plex Mono'
  const family = mono ? MONO[w >= 500 ? '500' : '400'] : PRETENDARD[String(Math.min(Math.max(Math.round(w / 100) * 100, 400), 600)) as keyof typeof PRETENDARD]
  return { fontFamily: family, fontSize, lineHeight, letterSpacing }
}

export const TABULAR = { fontVariant: ['tabular-nums' as const] }
