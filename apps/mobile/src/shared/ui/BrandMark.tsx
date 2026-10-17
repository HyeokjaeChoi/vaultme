// Figma: Brand/Mark 495:17569 (Size 72, Tone OnLight: Blue A tile, white ring + keyhole). Owner draft kept 2026-10-17.
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../theme'

/** VaultMe mark. Decorative: the wordmark next to it names the app. The Figma vector is 72 pt; `size` scales it. */
export function BrandMark({ size = 72 }: { size?: number }) {
  const t = useTheme()
  const tile = t.component.buttonB.primary.bg
  const glyph = t.component.icon.action.onPrimary
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" fill="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Path d="M54 0H18C8.05887 0 0 8.05887 0 18V54C0 63.9411 8.05887 72 18 72H54C63.9411 72 72 63.9411 72 54V18C72 8.05887 63.9411 0 54 0Z" fill={tile} />
      <Path d="M57 36C57 47.598 47.598 57 36 57C24.402 57 15 47.598 15 36C15 24.402 24.402 15 36 15C47.598 15 57 24.402 57 36Z" stroke={glyph} strokeWidth={4} />
      <Path
        d="M36 25C37.4673 24.985 38.8965 25.4669 40.0551 26.3674C41.2137 27.2679 42.0336 28.5339 42.3813 29.9594C42.729 31.385 42.5841 32.8863 41.9702 34.2191C41.3563 35.5519 40.3094 36.6377 39 37.3L41 48H31L33 37.3C31.6906 36.6377 30.6437 35.5519 30.0298 34.2191C29.4159 32.8863 29.271 31.385 29.6187 29.9594C29.9664 28.5339 30.7863 27.2679 31.9449 26.3674C33.1035 25.4669 34.5327 24.985 36 25Z"
        fill={glyph}
      />
    </Svg>
  )
}
