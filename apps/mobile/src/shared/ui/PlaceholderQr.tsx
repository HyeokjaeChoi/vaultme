// Figma: Placeholder QR (not scannable) 308:848, Placeholder badge 314:2575, Modules 308:1193
import { View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { useTheme } from '../theme'
import { qrModulesSvg } from './artwork'
import { Text } from './Text'

/** Labelled placeholder (Figma B-S30 423:13930 + caption). The modules are a static, non-scannable picture, 200 pt, on a fixed white square (Figma 423:15532 keeps it white in dark too); the caption under it says so. No real QR is ever rendered (AGENTS rule 4). */
export function PlaceholderQr({ note }: { note: string }) {
  const t = useTheme()
  const modules = t.primitive.size.wallet_status_card - t.primitive.space[6] - t.primitive.space[2] * 2 // 200
  return (
    <View accessible accessibilityLabel={note} style={{ alignItems: 'center', gap: t.semantic.layout.fieldGap }}>
      <SvgXml xml={qrModulesSvg} width={modules} height={modules} />
      <Text variant="caption" color={t.semantic.text.tertiary}>{note}</Text>
    </View>
  )
}
