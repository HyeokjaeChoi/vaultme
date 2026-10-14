import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useTheme } from '@/shared/theme'
import { Button, Input, Screen, ScreenHeader, Segmented, SensitiveReveal, Switch, Text } from '@/shared/ui'
import { goBack } from '@/shared/lib/nav'
import { biometryType, getBackupDone, hasPhrase, openKv, setBackupDone } from '@/shared/storage'

// Dev-only gallery for the C29-C33 primitives (not linked from the app). Words are placeholders.
const words = ['word', 'word', 'word', 'word', 'word', 'word'] as const

// Dev-only smoke check through shared/storage: encrypted MMKV round-trip + keychain status. No secrets shown.
function NativeSmoke() {
  const [line, setLine] = useState('native: …')
  useEffect(() => {
    const run = async () => {
      try {
        await openKv()
        const before = getBackupDone()
        setBackupDone(!before)
        const mmkv = getBackupDone() === !before ? 'ok' : 'FAIL'
        setBackupDone(before)
        const has = await hasPhrase()
        const bio = await biometryType()
        setLine(`native: mmkv ${mmkv} / keychain phrase ${has ? 'yes' : 'no'} / biometry ${bio ?? 'none'}`)
      } catch (e) {
        setLine(`native: error ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    void run()
  }, [])
  return <Text variant="meta">{line}</Text>
}

export function KitPage() {
  const th = useTheme()
  const { t } = useTranslation()
  const [seg, setSeg] = useState<'12' | '24'>('12')
  const [on, setOn] = useState(true)
  return (
    <Screen header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}>
      <Text variant="title">Kit</Text>
      {__DEV__ ? <NativeSmoke /> : null}
      <Segmented options={[{ value: '24', label: '24단어' }, { value: '12', label: '12단어' }]} value={seg} onChange={setSeg} />
      <Switch label="switch" value={on} onValueChange={setOn} />
      <Input label="단어 1" placeholder="단어 입력" />
      <Input label="단어 2" error="형식이 맞지 않아요" />
      <SensitiveReveal words={words} />
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Button label="Primary" />
        <Button label="Secondary" variant="secondary" />
        <Button label="Ghost" variant="ghost" />
        <Button label="Disabled" disabled />
        <Button label="아주 긴 버튼 라벨은 두 줄까지 줄바꿈되어야 하고 그 이상은 잘려요 아주 긴 버튼 라벨" />
      </View>
    </Screen>
  )
}
