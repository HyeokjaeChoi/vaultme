// Figma: B/Account block 515:27571 (Name, Address, 복사 Secondary sm)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Button } from './Button'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = { name: string; address: string; copyLabel: string; onCopy: () => void; copied?: boolean }

/** Top block of Settings: wallet avatar, account name, short address (Address mono) and a visible "복사" Secondary sm button. The caller owns the copy (`useCopy`: impactLight haptic) and passes `copied` + the "복사했어요" `copyLabel` for 1.5 s (State=Copied 555:68342). */
export function AccountBlock({ name, address, copyLabel, onCopy, copied }: Props) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.rowGap }}>
      <View style={{ width: t.primitive.size.avatar_lg, height: t.primitive.size.avatar_lg, borderRadius: t.primitive.radius.pill, backgroundColor: t.semantic.surface.subtle, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="wallet" size={t.component.icon.size.feature} color={t.component.icon.account.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="headline">{name}</Text>
        <Text variant="address" color={t.semantic.text.secondary}>{address}</Text>
      </View>
      <Button size="sm" variant="secondary" icon="copy" label={copyLabel} {...(copied ? { copied } : {})} onPress={onCopy} />
    </View>
  )
}
