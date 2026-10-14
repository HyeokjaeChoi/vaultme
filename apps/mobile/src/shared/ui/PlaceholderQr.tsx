// Figma: Placeholder QR (not scannable) 308:848, Placeholder badge 314:2575, Modules 308:1193
import { View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { useTheme } from '../theme'
import { qrModulesSvg } from './artwork'
import { Text } from './Text'

/** Labelled placeholder. The modules are a static, non-scannable picture; the badge says so. No real QR is ever rendered (AGENTS rule 4). */
export function PlaceholderQr({ note }: { note: string }) {
  const t = useTheme()
  const card = t.primitive.size.wallet_status_card - t.primitive.space[6] // 216
  const modules = card - t.primitive.space[2] * 2 // 200
  const w = t.component.receivePanel.warning
  return (
    <View
      accessible
      focusable={false} // Android: no grey keyboard-focus highlight on a read-only row
      accessibilityLabel={note}
      style={{ width: card, height: card, borderRadius: t.semantic.shape.group, backgroundColor: t.primitive.color.neutral[0], alignItems: 'center', justifyContent: 'center' }}
    >
      <SvgXml xml={qrModulesSvg} width={modules} height={modules} />
      <View
        style={{
          position: 'absolute',
          paddingHorizontal: t.primitive.space[2] + t.primitive.space['0_5'],
          paddingVertical: t.primitive.space[1] + t.primitive.borderWidth.hairline,
          borderRadius: t.primitive.radius.pill,
          borderWidth: t.primitive.borderWidth.hairline,
          borderColor: w.fg,
          backgroundColor: w.bg,
        }}
      >
        <Text variant="meta" color={w.fg}>{note}</Text>
      </View>
    </View>
  )
}
