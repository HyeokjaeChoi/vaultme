// Figma: B-S01 시작 423:13440 (dark 430:15497): Brand block (mark 72, wordmark, one sentence) centered in the area above two stacked buttons (optical lift 48), Secondary above Primary
import { Redirect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAccountAddress } from '@/features/backup'
import Constants from 'expo-constants'
import { account } from '@/entities/account'
import { BrandScreen, Button } from '@/shared/ui'

/** B-S01 시작. `?demo=1` is a __DEV__ capture override: show Start even when a wallet exists. */
export function StartPage({ demo = false }: { demo?: boolean }) {
  const { t } = useTranslation()
  const router = useRouter()
  const address = useAccountAddress()
  if (address && !demo) return <Redirect href="/home" /> // a wallet exists: cold start (after unlock) opens Home
  return (
    <BrandScreen
      wordmark
      anchor="start"
      title={t('start.title')}
      bodyVariant="title2"
      fact={`v${Constants.expoConfig?.version ?? ''} · ${account.network} · chain id ${String(account.chainId)}`}
      body={t('start.body')}
      actions={
        <>
          <Button label={t('start.restore')} variant="secondary" onPress={() => router.push('/restore')} />
          <Button label={t('start.create')} onPress={() => router.push('/precheck')} />
        </>
      }
    />
  )
}
