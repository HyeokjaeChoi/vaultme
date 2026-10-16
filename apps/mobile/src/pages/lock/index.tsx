import { useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { authenticate, type AuthResult } from '@/shared/auth'
import { biometryType } from '@/shared/storage'
import { useTheme } from '@/shared/theme'
import { Button, Icon, Screen, StatusNotice, Text } from '@/shared/ui'

const BODY = { FaceID: 'faceId', Face: 'face', TouchID: 'fingerprint', Fingerprint: 'fingerprint' } as const

/** R-S90 잠금. Rendered by the lock gate instead of the app. Prompts once on show; the button prompts again. */
export function LockPage({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useTranslation()
  const th = useTheme()
  const [method, setMethod] = useState<keyof typeof BODY | 'passcode' | null>(null)
  const [failure, setFailure] = useState<Exclude<AuthResult, 'ok' | 'cancelled'> | null>(null)
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  const prompted = useRef(false)
  const mark = th.primitive.space[10] + th.primitive.space[8] // 72

  const prompt = useCallback(async () => {
    setBusy(true)
    setFailure(null)
    const r = await authenticate(t('lock.authPrompt'))
    if (!alive.current) return
    setBusy(false)
    if (r === 'ok') onUnlock()
    else if (r !== 'cancelled') setFailure(r)
  }, [onUnlock, t])

  useEffect(() => {
    alive.current = true
    // Body copy names the device's method; it settles before the first paint of text (one async read).
    biometryType().then(
      (b) => alive.current && setMethod(b !== null && b in BODY ? (b as keyof typeof BODY) : 'passcode'),
      () => alive.current && setMethod('passcode'),
    )
    if (!prompted.current) {
      prompted.current = true
      void prompt()
    }
    return () => {
      alive.current = false
    }
  }, [prompt])

  return (
    <Screen
      footer={
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          {failure ? <StatusNotice tone={failure === 'error' ? 'danger' : 'warning'} title={t(`lock.${failure}.title`)} body={t(`lock.${failure}.body`)} /> : null}
          <Button label={t('lock.unlock')} onPress={() => void prompt()} busy={busy} />
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: th.semantic.layout.sectionGap.product }}>
        {/* ponytail: Figma mark icon is 30 px; nearest token is icon_xl (32). */}
        <View style={{ width: mark, height: mark, borderRadius: th.primitive.radius.xl, backgroundColor: th.semantic.brand.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="backup" size={th.primitive.size.icon_xl} color={th.semantic.text.onBrand} />
        </View>
        <Text variant="displayL" accessibilityRole="header">{t('lock.title')}</Text>
        {method ? <Text variant="body" color={th.semantic.text.secondary} style={{ textAlign: 'center' }}>{t(`lock.body.${BODY[method as keyof typeof BODY] ?? 'passcode'}`)}</Text> : null}
      </View>
    </Screen>
  )
}
