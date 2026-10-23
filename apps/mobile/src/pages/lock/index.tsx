// Figma: B-S90 잠금 423:15412 (Face ID 진행 중, dark 430:16073), 515:33081 (실패·취소, dark 515:33242): Brand block fixed, actions slot 56 high = Face ID status row or the "잠금 해제" button
import { useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { authenticate, type AuthResult } from '@/shared/auth'
import { biometryType } from '@/shared/storage'
import { haptic } from '@/shared/lib/haptics'
import { useTheme } from '@/shared/theme'
import { BLOOM_MS, EASE_OUT } from '@/shared/theme/motion'
import { BrandScreen, Button, Icon, Text } from '@/shared/ui'

const BODY = { FaceID: 'faceId', Face: 'face', TouchID: 'fingerprint', Fingerprint: 'fingerprint' } as const
type Failure = Exclude<AuthResult, 'ok' | 'cancelled'>

/**
 * B-S90 잠금. Rendered by the lock gate instead of the app. The OS prompt starts by itself on mount (owner 2026-10-17): the status row says which method is running.
 * A cancel or a failure turns the row into the "잠금 해제" button (a failure also changes the body line); the mark and title never move.
 * `initial` is a __DEV__ capture override of the two states (no OS prompt).
 */
export function LockPage({
  onUnlock,
  autoPrompt = true,
  initial,
}: {
  onUnlock: () => void
  autoPrompt?: boolean
  initial?: 'checking' | 'failed'
}) {
  const { t } = useTranslation()
  const th = useTheme()
  const [method, setMethod] = useState<keyof typeof BODY | 'passcode' | null>(null)
  const [failure, setFailure] = useState<Failure | null>(initial === 'failed' ? 'error' : null)
  const [busy, setBusy] = useState(initial === 'checking')
  const alive = useRef(true)
  const prompted = useRef(false)
  const reduce = useReducedMotion()
  const bloom = useSharedValue(0)
  const fade = useSharedValue(1)
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.get() }))

  const prompt = useCallback(async () => {
    setBusy(true)
    setFailure(null)
    const r = await authenticate(t('lock.authPrompt'))
    if (!alive.current) return
    if (r !== 'ok') setBusy(false) // on success the status row stays until the app opens
    if (r === 'ok') {
      // Success: one haptic, the keyhole blooms (Reduce Motion: cross-fade), then the app opens.
      haptic.success()
      const timing = { duration: BLOOM_MS, easing: EASE_OUT }
      if (reduce) fade.set(withTiming(0, timing))
      else bloom.set(withTiming(1, timing))
      setTimeout(onUnlock, BLOOM_MS)
    } else if (r !== 'cancelled') setFailure(r)
  }, [onUnlock, t, reduce, bloom, fade])

  useEffect(() => {
    alive.current = true
    // Copy names the device's method; it settles before the first paint of text (one async read).
    biometryType().then(
      (b) => alive.current && setMethod(b !== null && b in BODY ? (b as keyof typeof BODY) : 'passcode'),
      () => alive.current && setMethod('passcode'),
    )
    if (autoPrompt && !prompted.current) {
      prompted.current = true
      void prompt()
    }
    return () => {
      alive.current = false
    }
  }, [prompt, autoPrompt])

  const key = method ? (BODY[method as keyof typeof BODY] ?? 'passcode') : null
  const body = failure
    ? `${t(`lock.${failure}.title`)}. ${t(`lock.${failure}.body`)}`
    : key
      ? t(`lock.body.${key}`)
      : undefined
  return (
    <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      <BrandScreen
        wordmark
        bloom={bloom}
        title={t('lock.title')}
        {...(body ? { body } : {})}
        actions={
          busy ? (
            <View
              accessibilityLiveRegion="polite"
              style={{
                height: th.component.buttonB.height.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: th.primitive.space[2],
              }}
            >
              {key === 'faceId' || key === 'face' ? (
                <Icon name="face" size={(th.primitive.size.icon_xl * 2) / 3} color={th.semantic.icon.primary} />
              ) : null}
              {key ? (
                <Text variant="label" color={th.semantic.text.secondary}>
                  {t(`lock.checking.${key}`)}
                </Text>
              ) : null}
            </View>
          ) : (
            <Button label={t('lock.unlock')} onPress={() => void prompt()} />
          )
        }
      />
    </Animated.View>
  )
}
