// Figma: Brand/Mark 495:17569 (option A, owner pick 2026-10-17: V monogram with keyhole negative space on a rounded tile; Size 96 = brand screens, Tone OnLight = Blue A tile, white glyph)
import { View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../theme'

// Own artwork (VaultMe mark, exported from Figma 565:88546). The keyhole is the hole of the glyph path; it shows the tile color.
const TILE =
  'M0 24C0 10.7452 10.7452 0 24 0H72C85.2548 0 96 10.7452 96 24V72C96 85.2548 85.2548 96 72 96H24C10.7452 96 0 85.2548 0 72V24Z'
const GLYPH =
  'M73.619 22C76.9682 22 77.8293 23.462 76.2015 26.3857L50.9418 71.8072C49.3141 74.7309 47.686 74.7309 46.0583 71.8072L20.7986 26.3857C19.1709 23.4621 20.0313 22.0001 23.3802 22H73.619ZM50.1431 26.5161C45.9812 26.5161 42.6073 29.8859 42.6073 34.0429C42.6073 36.6579 43.9433 38.9602 45.97 40.3093L43.6523 51.9268C43.4917 52.7161 43.8131 53.1108 44.6169 53.1108H55.2671C56.0708 53.1108 56.3923 52.7162 56.2316 51.9268L53.9572 40.5328C56.1834 39.2247 57.6789 36.8092 57.6789 34.0429C57.6789 29.8859 54.305 26.5161 50.1431 26.5161Z'
const GRID = 96
const KEYHOLE = { x: 50.1, y: 34 } // center of the keyhole circle on the 96 grid
const TILE_RADIUS = 24

/**
 * VaultMe mark. Decorative: the wordmark next to it names the app. `size` scales the 96 pt Figma vector.
 * `bloom` (0..1) draws the unlock motion: the tile color spreads from the keyhole over the glyph (Figma S90 note: 400 ms ease-out). The caller owns the timing.
 */
export function BrandMark({ size = GRID, bloom }: { size?: number; bloom?: SharedValue<number> }) {
  const t = useTheme()
  const tile = t.component.buttonB.primary.bg
  const glyph = t.component.icon.action.onPrimary
  const k = size / GRID
  // The farthest glyph corner is about 45 grid points from the keyhole; 2 x 48 covers it.
  const reach = 96 * k
  const bloomStyle = useAnimatedStyle(() => ({ transform: [{ scale: bloom ? bloom.get() : 0 }] }))
  return (
    <View
      style={{ width: size, height: size, borderRadius: TILE_RADIUS * k, overflow: 'hidden' }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox={`0 0 ${String(GRID)} ${String(GRID)}`} fill="none">
        <Path d={TILE} fill={tile} />
        <Path d={GLYPH} fill={glyph} fillRule="evenodd" clipRule="evenodd" />
      </Svg>
      {bloom ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: KEYHOLE.x * k - reach / 2,
              top: KEYHOLE.y * k - reach / 2,
              width: reach,
              height: reach,
              borderRadius: reach / 2,
              backgroundColor: tile,
            },
            bloomStyle,
          ]}
        />
      ) : null}
    </View>
  )
}
