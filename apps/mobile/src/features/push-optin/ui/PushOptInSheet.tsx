import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, Text } from '@/shared/ui'

/** S50 Push opt-in sheet. Static: the buttons only close it. */
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
          <Button label={t('pushSheet.enable')} onPress={onClose} />
          <Button label={t('pushSheet.later')} variant="ghost" onPress={onClose} />
        </>
      }
    >
      <Text color={th.semantic.text.secondary}>{t('pushSheet.body')}</Text>
    </BottomSheet>
  )
}
