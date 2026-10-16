import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { goBack } from '@/shared/lib/nav'
import { createWallet } from '@/features/backup/model/createWallet'

/** B-S02 시작 전에 확인 (Figma 423:13478): two warning notices and one info notice. */
export function PrecheckPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])
  const create = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await createWallet({ title: t('backup.authPromptSave'), cancel: t('common.cancel') })
      if (alive.current) router.replace('/home') // not if the user left while the OS auth sheet was open
    } catch {
      setBusy(false)
      setFailed(true) // keychain refused to save (e.g. no device passcode): stay here and say so
    }
  }
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/')} />}
      footer={<Button label={t('precheck.cta')} busy={busy} onPress={() => void create()} />}
    >
      <Text variant="title1" accessibilityRole="header">{t('precheck.title')}</Text>
      <StatusNotice tone="warning" title={t('precheck.lose.title')} body={t('precheck.lose.body')} />
      <StatusNotice tone="warning" title={t('precheck.scam.title')} body={t('precheck.scam.body')} />
      <StatusNotice tone="info" title={t('precheck.testnet.title')} body={t('precheck.testnet.body')} />
      {failed ? <StatusNotice tone="danger" title={t('precheck.createError.title')} body={t('precheck.createError.body')} /> : null}
    </Screen>
  )
}
