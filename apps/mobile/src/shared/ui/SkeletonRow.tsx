// Figma: B/Skeleton row 422:668
import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../theme'

/** Loading placeholder for a Row: 40 pt avatar, two text bars and a value bar in skeleton.bg. Pulses opacity (off under Reduce Motion). */
export function SkeletonRow() {
  const t = useTheme()
  const c = t.component.skeleton
  const reduce = useReducedMotion()
  const p = useSharedValue(1)
  useEffect(() => {
    // ponytail: 0.56 low point is opacity.56; duration slowMs per half-cycle. Tune on device.
    if (!reduce)
      p.set(
        withRepeat(
          withTiming(t.primitive.opacity[56], {
            duration: t.primitive.motion.duration.slowMs * 2,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true,
        ),
      )
  }, [p, reduce, t.primitive.opacity, t.primitive.motion.duration.slowMs])
  const pulse = useAnimatedStyle(() => ({ opacity: p.get() }))
  const bar = { backgroundColor: c.bg, borderRadius: c.radius }
  return (
    <Animated.View
      accessible
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          minHeight: t.component.rowB.height,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.semantic.layout.rowGap,
        },
        pulse,
      ]}
    >
      <View
        style={{
          width: t.primitive.size.avatar_md,
          height: t.primitive.size.avatar_md,
          borderRadius: t.primitive.radius.pill,
          backgroundColor: c.bg,
        }}
      />
      <View style={{ flex: 1, gap: c.gap, overflow: 'hidden' }}>
        <View
          style={{ ...bar, width: t.primitive.space[20] * 2, height: t.primitive.space[3] + t.primitive.space['0_5'] }}
        />
        <View
          style={{ ...bar, width: t.primitive.space[20] + t.primitive.space[5], height: t.primitive.size.icon_xs }}
        />
      </View>
      <View style={{ ...bar, width: t.primitive.space[16], height: t.primitive.space[3] + t.primitive.space['0_5'] }} />
    </Animated.View>
  )
}
