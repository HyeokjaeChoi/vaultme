// Figma: Keypad 330:3423 (Icon / action / backspace 330:2747); Redesign B: B/Keypad 421:888, B/Keypad key 421:825
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
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

type Labels = { dot: string; delete: string }
/** `dot` = ETH asset key ".", `doubleZero` = USDC asset key "00" (sends "0" twice). */
type AssetKey = 'dot' | 'doubleZero'

function Key({ cell, assetKey, labels, onKey }: { cell: Cell; assetKey: AssetKey; labels: Labels; onKey: (k: KeypadKey) => void }) {
  const t = useTheme()
  const { style, handlers } = usePressScale()
  const doubleZero = cell === 'aux' && assetKey === 'doubleZero'
  const text = cell === 'aux' ? (doubleZero ? '00' : '.') : cell
  const label = cell === 'backspace' ? labels.delete : cell === 'aux' && !doubleZero ? labels.dot : text
  const press = () => {
    if (cell === 'aux') {
      if (doubleZero) {
        onKey('0')
        onKey('0')
      } else onKey('.')
    } else onKey(cell)
  }
  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={press}
        {...handlers}
        style={{ height: t.component.buttonB.height.lg, borderRadius: t.component.buttonB.radius, alignItems: 'center', justifyContent: 'center' }}
      >
        {cell === 'backspace' ? <Icon name="backspace" size={t.component.icon.size.feature} color={t.semantic.text.primary} /> : <Text variant="title2" tabular maxFontSizeMultiplier={1.3}>{text}</Text>}
      </Pressable>
    </Animated.View>
  )
}

/** C34 Keypad (Redesign B). 3x4 text keys on one 56 pt row height, Title 2 digits (capped at 1.3x), no fills, no gaps. The bottom-left asset key is "." (ETH) or "00" (USDC). Backspace is icon-only ("지우기"). Press feedback: scale 0.97, 100 ms. */
export function Keypad({ onKey, labels, assetKey = 'dot' }: { onKey: (k: KeypadKey) => void; labels: Labels; assetKey?: AssetKey }) {
  return (
    <View>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row' }}>
          {row.map((c) => (
            <Key key={c} cell={c} assetKey={assetKey} labels={labels} onKey={onKey} />
          ))}
        </View>
      ))}
    </View>
  )
}
