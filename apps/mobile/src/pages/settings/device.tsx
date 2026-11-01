// Figma: B-S92 기기 보안 안내 423:15474 (dark 430:16113): neutral info shield hero, Title 1, three body lines, one Primary button
import { useTranslation } from 'react-i18next'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { BrandScreen, Button, Icon } from '@/shared/ui'

/** B-S92 기기 보안 경고. Opens from the S60 row, and once on its own when `expo-device` experimental root/jailbreak check says yes (warn only, ADR-0028). */
export function DeviceWarningPage() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <BrandScreen
      hero={
        <Icon
          name="deviceWarning"
          weight="duotone"
          size={th.primitive.size.avatar_lg + th.primitive.space[6]}
          color={th.component.icon.status.info}
        />
      }
      title={t('settings.deviceScreen.title')}
      body={t('settings.deviceScreen.body')}
      actions={<Button label={t('settings.deviceScreen.cta')} onPress={() => goBack('/settings')} />}
    />
  )
}
