// Figma: Segmented control 300:622
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props<T extends string> = { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }

/** C30 Segmented control. Two exclusive choices; selection is instant. Track subtle, selected segment white with a hairline border. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const t = useTheme()
  const pad = t.primitive.space[1]
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: pad, padding: pad, borderRadius: t.component.segmented.radius, backgroundColor: t.component.segmented.bg }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: t.primitive.size.touch_min,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: t.component.segmented.radius,
              borderWidth: on ? t.primitive.borderWidth.hairline : t.primitive.borderWidth.none,
              borderColor: t.component.segmented.border,
              backgroundColor: on ? t.component.segmented.selectedBg : t.component.segmented.bg,
            }}
          >
            <Text variant="label" color={on ? t.component.segmented.selectedFg : t.component.segmented.fg}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
