// Figma: Icon button 67:205
import { Pressable } from 'react-native'
import { useTheme } from '../theme'
import { Icon, type IconName } from './Icon'

type Props = { icon: IconName; label: string; onPress?: () => void; disabled?: boolean }

/** C02 Icon button. 44 px target, white (iconButton.bg) with radius 12. `label` is the action-specific accessible name. */
export function IconButton({ icon, label, onPress, disabled }: Props) {
  const t = useTheme()
  const c = t.component.iconButton
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: c.hitTarget,
        height: c.hitTarget,
        borderRadius: c.radius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? c.bg.pressed : c.bg.default,
      })}
    >
      <Icon name={icon} size={c.iconSize} color={disabled ? c.disabledFg : c.fg} />
    </Pressable>
  )
}
