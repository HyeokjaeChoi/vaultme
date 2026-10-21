import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { enableTxPush } from '@/features/push'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, StatusNotice, Text } from '@/shared/ui'

/**
 * B-S50 Push opt-in sheet (Figma 423:14215, with Receive 652:107697): Secondary 나중에 above, Primary 알림 켜기 below.
 * 알림 켜기 asks the OS and registers the address. The OS saying no closes the sheet (S62 shows the denied state).
 * A failed registration keeps it open (Figma S50 failed 664:109243): a danger notice in the sheet's notice slot, Primary becomes 다시 시도, 나중에 closes.
 * `failed` seeds the failed state for __DEV__ design captures only.
 */
export function PushOptInSheet({ visible, onClose, failed: seeded = false }: { visible: boolean; onClose: () => void; failed?: boolean }) {
  const { t } = useTranslation()
  const th = useTheme()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(seeded)
  const close = () => {
    setFailed(false)
    onClose()
  }
  const enable = async () => {
    setBusy(true)
    const result = await enableTxPush()
    setBusy(false)
    if (result === 'error' || result === 'unavailable') setFailed(true)
    else close()
  }
  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={t('pushSheet.title')}
      notice={failed ? <StatusNotice tone="danger" title={t('pushSheet.failed.title')} body={t('pushSheet.failed.body')} /> : undefined}
      actions={
        <>
          <Button label={t('pushSheet.later')} variant="secondary" onPress={close} />
          <Button label={failed ? t('pushSheet.retry') : t('pushSheet.enable')} disabled={busy} onPress={() => void enable()} />
        </>
      }
    >
      <Text color={th.semantic.text.secondary}>{t('pushSheet.body')}</Text>
    </BottomSheet>
  )
}
