// Figma: B-S30 QR code (S30 423:14163): 220 pt tile, 29-module symbol with a 4-module quiet zone, white tile + neutral.950 modules in both modes
import QRCodeSvg from 'react-native-qrcode-svg'
import { View } from 'react-native'
import QRCode from 'qrcode'
import { useTheme } from '../theme'

const QUIET_MODULES = 4

/**
 * Real QR code of one address (the S30 receive screen). The tile stays white in Dark: scanners need dark modules on a light field.
 * Error correction M (library default; the CI test decodes the same matrix). Size 220 pt includes the quiet zone (4 modules).
 */
export function QrCode({ value, label }: { value: string; label: string }) {
  const t = useTheme()
  const size = t.primitive.size.wallet_status_card - t.primitive.space[5] // 220
  const modules = QRCode.create(value, { errorCorrectionLevel: 'M' }).modules.size
  const quiet = (QUIET_MODULES * size) / (modules + QUIET_MODULES * 2)
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ alignSelf: 'center', borderRadius: t.primitive.radius.md, overflow: 'hidden' }}>
      <QRCodeSvg value={value} size={size} quietZone={quiet} ecl="M" backgroundColor={t.primitive.color.neutral[0]} color={t.primitive.color.neutral[950]} />
    </View>
  )
}
