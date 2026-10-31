// Figma: Address block 68:197 (Icon / action / copy 137:144); B/Address 494:1090
import { Text as RNText } from 'react-native'
import { ADDRESS_HEAD, ADDRESS_TAIL, addressA11yLabel, displayAddress } from '../lib/address'
import { textStyle } from '../theme/fonts'
import { useTheme } from '../theme'

type TextProps = {
  address: string
  /** Character indexes of the displayed address to mark (look-alike diff, `diffChars`). */ highlight?: number[]
  color?: string
  markColor?: string
  /** F = Fact 12/16 (transaction hash), S = 14/20 (contract address, look-alike compare), M = 16/24 (review, result, detail), L = body.lg 18/27 (receive). */ size?:
    'F' | 'S' | 'M' | 'L'
  /** First 6 and last 4 characters strong + text/primary, the middle text/secondary (helps spot address poisoning). Default on. */ emphasis?: boolean
}

type Kind = 'mid' | 'end' | 'hit'

/**
 * Full address (Figma B/Address 494:1090): one contiguous run in IBM Plex Mono, no group spaces, natural wrap, never truncated. The head (0x + 4) and tail (4) are strong (600, text/primary),
 * the middle regular in text/secondary. Characters in `highlight` (look-alike diff) are marked one by one: strong + danger color (not color alone).
 */
export function AddressText({ address, highlight = [], color, markColor, size = 'M', emphasis = true }: TextProps) {
  const t = useTheme()
  const type = t.primitive.type
  const scale =
    size === 'L'
      ? type.body.lg
      : size === 'F'
        ? type.productB.fact
        : size === 'S'
          ? type.productB.address
          : type.productB.body
  const base = {
    ...type.productB.address,
    fontSize: scale.fontSize,
    lineHeight: scale.lineHeight,
    ...(size === 'F' ? { letterSpacing: type.productB.fact.letterSpacing } : {}),
  }
  const strong = textStyle({ ...base, fontWeight: '600' })
  const middle = color ?? (emphasis ? t.semantic.text.secondary : t.component.addressBlock.value)
  const ends = color ?? t.semantic.text.primary
  const text = displayAddress(address)
  const marks = new Set(highlight)
  const runs: { kind: Kind; text: string }[] = []
  Array.from(text).forEach((c, i) => {
    const kind: Kind = marks.has(i)
      ? 'hit'
      : emphasis && (i < ADDRESS_HEAD || i >= text.length - ADDRESS_TAIL)
        ? 'end'
        : 'mid'
    const last = runs[runs.length - 1]
    if (last?.kind === kind) last.text += c
    else runs.push({ kind, text: c })
  })
  const style = {
    hit: { ...strong, color: markColor ?? t.semantic.status.danger.fg },
    end: { ...strong, color: ends },
    mid: null,
  } as const
  return (
    <RNText accessibilityLabel={addressA11yLabel(address)} style={{ ...textStyle(base), color: middle }}>
      {runs.map((r, i) =>
        r.kind === 'mid' ? (
          r.text
        ) : (
          <RNText key={i} style={style[r.kind]}>
            {r.text}
          </RNText>
        ),
      )}
    </RNText>
  )
}
