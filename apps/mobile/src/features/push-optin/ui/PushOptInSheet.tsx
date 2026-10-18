import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { enableTxPush } from '@/features/push'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, Text } from '@/shared/ui'

/**
 * B-S50 Push opt-in sheet (Figma 423:14215, with Receive 652:107697): Secondary 나중에 above, Primary 알림 켜기 below.
 * 알림 켜기 asks the OS and registers the address; the sheet closes whatever the answer is. A refusal shows on S62 (denied state), a failed registration leaves the switch off there.
 */
export function PushOptInSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const th = useTheme()
  const [busy, setBusy] = useState(false)
  const enable = async () => {
    setBusy(true)
    await enableTxPush()
    setBusy(false)
    onClose()
  }
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('pushSheet.title')}
      actions={
        <>
          <Button label={t('pushSheet.later')} variant="secondary" onPress={onClose} />
          <Button label={t('pushSheet.enable')} disabled={busy} onPress={() => void enable()} />
        </>
      }
    >
      <Text color={th.semantic.text.secondary}>{t('pushSheet.body')}</Text>
    </BottomSheet>
  )
}
