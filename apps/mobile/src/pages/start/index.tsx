import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { Button, Screen, Text } from '@/shared/ui'

/** S01 시작 */
export function StartPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  return (
    <Screen
      footer={
        <>
          <Button label={t('start.create')} onPress={() => router.push('/precheck')} />
          <Button label={t('start.restore')} variant="secondary" onPress={() => router.replace({ pathname: '/home', params: { variant: 'restored' } })} />
        </>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: th.semantic.layout.groupGap }}>
        <Text variant="title">{t('start.title')}</Text>
        <Text color={th.semantic.text.secondary}>{t('start.body')}</Text>
      </View>
    </Screen>
  )
}
