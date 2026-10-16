import { Redirect, useRouter } from 'expo-router'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { useAccountAddress } from '@/features/backup/model/useAccountAddress'
import { Button, Screen, Text } from '@/shared/ui'

/** B-S01 시작 (Figma 423:13440): VaultMe wordmark and one sentence, vertically centered. Secondary "기존 지갑 복구" above, Primary "새 지갑 만들기" below. */
export function StartPage({ demo = false }: { demo?: boolean }) {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const address = useAccountAddress()
  if (address && !demo) return <Redirect href="/home" /> // a wallet exists: cold start (after unlock) opens Home
  return (
    <Screen
      footer={
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          <Button label={t('start.restore')} variant="secondary" onPress={() => router.push('/restore')} />
          <Button label={t('start.create')} onPress={() => router.push('/precheck')} />
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: th.semantic.layout.fieldGap }}>
        <Text variant="displayL" accessibilityRole="header">{t('start.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t('start.body')}</Text>
      </View>
    </Screen>
  )
}
