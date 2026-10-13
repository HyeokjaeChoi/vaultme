import { useState } from 'react'
import { View } from 'react-native'
import { useTheme } from '@/shared/theme'
import { Button, Input, Screen, Segmented, SensitiveReveal, Switch, Text } from '@/shared/ui'

// Dev-only gallery for the C29-C33 primitives (not linked from the app). Words are placeholders.
const words = ['word', 'word', 'word', 'word', 'word', 'word'] as const

export function KitPage() {
  const th = useTheme()
  const [seg, setSeg] = useState<'12' | '24'>('12')
  const [on, setOn] = useState(true)
  return (
    <Screen>
      <Text variant="title">Kit</Text>
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
