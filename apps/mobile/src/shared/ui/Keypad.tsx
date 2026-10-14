// Figma: Keypad 330:3423 (Icon / action / backspace 330:2747)
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import type { KeypadKey } from '../lib/amount'
import { useTheme } from '../theme'
import { usePressScale } from '../theme/motion'
import { Icon } from './Icon'
import { Text } from './Text'

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
]

type Labels = { dot: string; delete: string }

function Key({ k, labels, onKey }: { k: KeypadKey; labels: Labels; onKey: (k: KeypadKey) => void }) {
  const t = useTheme()
  const { style, handlers } = usePressScale()
  const label = k === '.' ? labels.dot : k === 'backspace' ? labels.delete : k
  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => onKey(k)}
        {...handlers}
        style={{ minHeight: t.primitive.size.control_lg, alignItems: 'center', justifyContent: 'center' }}
      >
        {k === 'backspace' ? <Icon name="backspace" size={t.component.icon.size.control} color={t.semantic.text.primary} /> : <Text variant="title" maxFontSizeMultiplier={1.3}>{k}</Text>}
      </Pressable>
    </Animated.View>
  )
}

/** C34 Keypad. 3x4 text-only keys (1-9, ., 0, backspace), 52 pt min-height rows that grow with large text (digits capped at 1.3x). Every key is a button with a label; backspace is icon-only ("지우기"). Press feedback only: scale 0.97, 160 ms. */
export function Keypad({ onKey, labels }: { onKey: (k: KeypadKey) => void; labels: Labels }) {
  const t = useTheme()
  return (
    <View style={{ gap: t.semantic.layout.fieldGap }}>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: t.semantic.layout.fieldGap }}>
          {row.map((k) => (
            <Key key={k} k={k} labels={labels} onKey={onKey} />
          ))}
        </View>
      ))}
    </View>
  )
}
