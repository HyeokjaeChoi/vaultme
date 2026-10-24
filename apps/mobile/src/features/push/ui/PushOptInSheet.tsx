import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, Text } from '@/shared/ui'
import { pushDeps } from '../api/notifications'
import { enablePush } from '../model/push'

/**
 * B-S50 Push opt-in sheet (Figma 423:14215, with Receive 652:107697): Secondary 나중에 above, Primary 알림 켜기 below.
 * 알림 켜기 asks the OS and registers the address, then the sheet closes. While the request runs every dismissal path (나중에, scrim, drag) is ignored.
 * A failed registration also just closes it: the failure state waits for its Figma frames (#81).
 */
export function PushOptInSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const th = useTheme()
  const [busy, setBusy] = useState(false)
  const close = () => {
    if (!busy) onClose() // a late success must not turn notifications on after the user said 나중에
  }
  const enable = async () => {
    setBusy(true)
    await enablePush(pushDeps)
    setBusy(false)
    onClose()
  }
  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={t('pushSheet.title')}
      actions={
        <>
          <Button label={t('pushSheet.later')} variant="secondary" disabled={busy} onPress={close} />
          <Button label={t('pushSheet.enable')} busy={busy} onPress={() => void enable()} />
        </>
      }
    >
      <Text color={th.semantic.text.secondary}>{t('pushSheet.body')}</Text>
    </BottomSheet>
  )
}
