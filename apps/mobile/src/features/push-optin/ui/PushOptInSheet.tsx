import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, Text } from '@/shared/ui'

/** B-S50 Push opt-in sheet (Figma 423:14215): Secondary 나중에 above, Primary 알림 켜기 below. Static: the buttons only close it. */
export function PushOptInSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('pushSheet.title')}
      actions={
        <>
          <Button label={t('pushSheet.later')} variant="secondary" onPress={onClose} />
          <Button label={t('pushSheet.enable')} onPress={onClose} />
        </>
      }
    >
      <Text color={th.semantic.text.secondary}>{t('pushSheet.body')}</Text>
    </BottomSheet>
  )
}
