import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, StatusNotice, Text } from '@/shared/ui'
import { pushDeps } from '../api/notifications'
import { enablePush } from '../model/push'

/**
 * B-S50 Push opt-in sheet (Figma 423:14215, with Receive 652:107697; failed 664:109243): Secondary 나중에 above, Primary 알림 켜기 below.
 * 알림 켜기 asks the OS and registers the address. On (or OS refused): the sheet closes. Failed: it stays open with a danger notice and Primary 다시 시도.
 * While the request runs no dismissal path (나중에, scrim, back, drag) closes it.
 */
export function PushOptInSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const th = useTheme()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const close = () => {
    setFailed(false)
    onClose()
  }
  const enable = async () => {
    setBusy(true)
    const result = await enablePush(pushDeps)
    setBusy(false)
    const failedNow = result === 'error' || result === 'unavailable'
    setFailed(failedNow)
    if (!failedNow) onClose()
  }
  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      dismissible={!busy} // a late success must not turn notifications on after the user said 나중에
      title={t('pushSheet.title')}
      notice={failed ? <StatusNotice tone="danger" title={t('pushSheet.failed')} /> : null}
      actions={
        <>
          <Button label={t('pushSheet.later')} variant="secondary" disabled={busy} onPress={close} />
          <Button
            label={failed ? t('pushSheet.retry') : t('pushSheet.enable')}
            busy={busy}
            onPress={() => void enable()}
          />
        </>
      }
    >
      <Text color={th.semantic.text.secondary}>{t('pushSheet.body')}</Text>
    </BottomSheet>
  )
}
