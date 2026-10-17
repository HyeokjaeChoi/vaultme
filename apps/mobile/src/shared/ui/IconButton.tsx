// Figma: Icon button 67:205 (Filled) / Icon button / Plain 330:3401 (bare navigation)
import { Pressable } from 'react-native'
import Animated from 'react-native-reanimated'
import { useTheme } from '../theme'
import { usePressScale } from '../theme/motion'
import { Icon, type IconName } from './Icon'

type Props = { icon: IconName; label: string; onPress?: () => void; disabled?: boolean; variant?: 'filled' | 'plain'; /** Icon color override for a control on a dark surface (QR scan close, Figma 618:102956). Default = iconButton.fg. */ color?: string }

/**
 * C02 Icon button. 44 px target, radius 12. `filled` = white chip (iconButton.bg); `plain` = no background at rest
 * (bare back / details control), pressed uses iconButton.bg.pressed. `label` is the action-specific accessible name.
 * Press feedback: scale 0.97, 160 ms ease-out (off under Reduce Motion).
 */
export function IconButton({ icon, label, onPress, disabled, variant = 'filled', color }: Props) {
  const t = useTheme()
  const c = t.component.iconButton
  const { style, handlers } = usePressScale()
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        {...handlers}
        style={({ pressed }) => ({
          width: c.hitTarget,
          height: c.hitTarget,
          borderRadius: c.radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? c.bg.pressed : variant === 'plain' ? 'transparent' : c.bg.default,
        })}
      >
        <Icon name={icon} size={c.iconSize} color={disabled ? c.disabledFg : (color ?? c.fg)} />
      </Pressable>
    </Animated.View>
  )
}
