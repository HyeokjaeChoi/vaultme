// Minimal react-native-reanimated stand-in for node tests. Records what the app asks for; runs no animation.
export const motion = { reduce: false }

class Keyframe {
  delayMs = 0
  durationMs = 0
  constructor(public frames: unknown) {}
  delay(ms: number) {
    this.delayMs = ms
    return this
  }
  duration(ms: number) {
    this.durationMs = ms
    return this
  }
}
const shared = <T>(v: T) => {
  const box = { v }
  return { get: () => box.v, set: (n: T) => void (box.v = n) }
}
const chain = () => ({ duration: () => chain(), easing: () => chain() })

export const reanimated = {
  Keyframe,
  Easing: { bezier: () => 'bezier', linear: 'linear' },
  cubicBezier: () => 'css-bezier',
  FadeIn: chain(),
  FadeOut: chain(),
  cancelAnimation: () => undefined,
  useReducedMotion: () => motion.reduce,
  useSharedValue: shared,
  // The style function is returned as is, so a test can call it and read the style a frame would get.
  useAnimatedStyle: <T>(fn: () => T) => fn,
  interpolate: (x: number, [a, b]: number[], [c, d]: number[]) =>
    (c ?? 0) + ((x - (a ?? 0)) / ((b ?? 1) - (a ?? 0))) * ((d ?? 0) - (c ?? 0)),
  withTiming: <T>(v: T) => v,
  withRepeat: <T>(v: T) => v,
  withSequence: <T>(v: T) => v,
  default: { View: 'Animated.View' },
}
