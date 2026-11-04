// Figma: B/Detail row 399:129, Kind=Value (Emphasis=Off 934:1685, Emphasis=On 934:1691, Show copy 934:10)
import { Pressable, View, useWindowDimensions } from 'react-native'
import { useTheme } from '../theme'
import { useCopy } from '../lib/useCopy'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = {
  label: string
  value: string
  /** Medium, text/primary value (the 상태 row). */
  emphasis?: boolean
  /** IBM Plex Mono value, for a hash, a short address or a time. */
  mono?: boolean
  /** Show the copy icon at the end of the value. `text` is what lands on the clipboard (the full address or hash); the row shows the short `value`. */
  copy?: { text: string; label: string; announce: string }
}

/** One value style for a detail list: label Body Small tertiary (160 wide), value Product B/Value secondary, right aligned, optional copy icon. At about 150% text the label sits above the value. */
export function DetailRow({ label, value, emphasis, mono, copy }: Props) {
  const t = useTheme()
  const { fontScale } = useWindowDimensions()
  const stacked = fontScale >= 1.5
  const { copied, copy: doCopy } = useCopy(copy?.announce ?? '')
  const text = (
    <Text
      variant={mono ? 'address' : emphasis ? 'label' : 'value'}
      color={emphasis ? t.semantic.text.primary : t.semantic.text.secondary}
      style={stacked ? undefined : { flex: 1, textAlign: 'right' }}
    >
      {value}
    </Text>
  )
  return (
    <View
      accessible={!copy}
      accessibilityLabel={copy ? undefined : `${label}, ${value}`}
      style={{
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'stretch' : 'center',
        gap: t.semantic.layout.rowGap,
        paddingVertical: t.primitive.space[3],
      }}
    >
      <Text
        variant="bodySmall"
        color={t.semantic.text.tertiary}
        style={stacked ? undefined : { width: t.primitive.space[10] * 4 }}
      >
        {label}
      </Text>
      {copy ? (
        <View
          style={{
            flex: stacked ? undefined : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.semantic.layout.rowGap,
          }}
        >
          {stacked ? <View style={{ flex: 1 }}>{text}</View> : text}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.label}
            onPress={() => void doCopy(copy.text)}
            hitSlop={t.primitive.space[3]}
          >
            <Icon
              name={copied ? 'check' : 'copy'}
              size={t.component.icon.size.control}
              color={t.component.icon.action.fg}
            />
          </Pressable>
        </View>
      ) : (
        text
      )}
    </View>
  )
}
