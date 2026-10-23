// Figma: B-S30 QR code (S30 423:14163): 220 pt symbol with a 4-module quiet zone, QR tile = surface/subtle, radius 2xl, padding space-3 (565:88604) around a white radius-xl field with neutral.950 modules in both modes
import QRCodeSvg from 'react-native-qrcode-svg'
import { View } from 'react-native'
import QRCode from 'qrcode'
import { useTheme } from '../theme'

const QUIET_MODULES = 4

/**
 * Real QR code of one address (the S30 receive screen). The tile stays white in Dark: scanners need dark modules on a light field.
 * Error correction M (library default; the CI test decodes the same matrix). The 220 pt symbol sits inside a 4-module quiet zone.
 */
export function QrCode({ value, label }: { value: string; label: string }) {
  const t = useTheme()
  const symbol = t.primitive.size.wallet_status_card - t.primitive.space[5] // 220: the module area (S30 shows a 220 pt symbol; the quiet zone is extra white)
  const modules = QRCode.create(value, { errorCorrectionLevel: 'M' }).modules.size
  const quiet = (QUIET_MODULES * symbol) / modules
  const size = symbol + quiet * 2
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{
        alignSelf: 'center',
        padding: t.primitive.space[3],
        borderRadius: t.primitive.radius['2xl'],
        backgroundColor: t.semantic.surface.subtle,
      }}
    >
      <View style={{ borderRadius: t.primitive.radius.xl, overflow: 'hidden' }}>
        <QRCodeSvg
          value={value}
          size={size}
          quietZone={quiet}
          ecl="M"
          backgroundColor={t.primitive.color.neutral[0]}
          color={t.primitive.color.neutral[950]}
        />
      </View>
    </View>
  )
}
