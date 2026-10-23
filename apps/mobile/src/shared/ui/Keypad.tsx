// Figma: Keypad 330:3423 (Icon / action / backspace 330:2747); Redesign B: B/Keypad 421:888, B/Keypad key 421:825
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { keyHaptic } from '../lib/haptics'
import type { KeypadKey } from '../lib/amount'
import { useTheme } from '../theme'
import { usePressScale } from '../theme/motion'
import { Icon } from './Icon'
import { Text } from './Text'

type Cell = KeypadKey | 'aux'
const ROWS: Cell[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['aux', '0', 'backspace'],
]

/** Returns `false` when the key was rejected (or made the amount too big): the haptic is then the warning cue, not selection. */
type OnKey = (k: KeypadKey) => boolean | void
type Labels = { dot: string; delete: string }
function Key({ cell, labels, onKey }: { cell: Cell; labels: Labels; onKey: OnKey }) {
  const t = useTheme()
  const { style, handlers } = usePressScale()
  const text = cell === 'aux' ? '.' : cell
  const label = cell === 'backspace' ? labels.delete : cell === 'aux' ? labels.dot : text
  const press = () => keyHaptic(onKey(cell === 'aux' ? '.' : cell))
  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={press}
        {...handlers}
        style={{
          height: t.component.buttonB.height.lg,
          borderRadius: t.component.buttonB.radius,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {cell === 'backspace' ? (
          <Icon name="backspace" size={t.component.icon.size.feature} color={t.semantic.text.primary} />
        ) : (
          <Text variant="title1" tabular maxFontSizeMultiplier={1.3}>
            {text}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  )
}

/** C34 Keypad (Redesign B). 3x4 text keys on one 56 pt row height, Title 1 digits 26 (capped at 1.3x), no fills, no gaps. The bottom-left key is "." for every asset (ETH and USDC; the asset only changes how many decimals `applyKey` accepts). Backspace is icon-only ("지우기"). Press feedback: scale 0.97, 100 ms, plus a selection haptic (warning haptic when `onKey` returns false). */
export function Keypad({ onKey, labels }: { onKey: OnKey; labels: Labels }) {
  return (
    <View>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row' }}>
          {row.map((c) => (
            <Key key={c} cell={c} labels={labels} onKey={onKey} />
          ))}
        </View>
      ))}
    </View>
  )
}
