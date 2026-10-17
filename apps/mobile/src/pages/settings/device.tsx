// Figma: B-S92 루팅·탈옥 경고 423:15474 (dark 430:16113): danger shield hero, Title 1, three body lines, one Primary button
import { useTranslation } from 'react-i18next'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { BrandScreen, Button, Icon } from '@/shared/ui'

/** B-S92 기기 보안 경고. Opens from the S60 row; the root/jailbreak detection that would raise it on its own is not built. */
export function DeviceWarningPage() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <BrandScreen
      hero={<Icon name="deviceWarning" weight="duotone" size={th.primitive.size.avatar_lg + th.primitive.space[6]} color={th.component.icon.status.failed} />}
      title={t('settings.deviceScreen.title')}
      body={t('settings.deviceScreen.body')}
      actions={<Button label={t('settings.deviceScreen.cta')} onPress={() => goBack('/settings')} />}
    />
  )
}
