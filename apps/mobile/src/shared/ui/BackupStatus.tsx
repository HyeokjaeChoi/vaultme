// Figma: Backup status 44:14 (State=Pending 44:2; Icon / status / warning 137:92)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Button } from './Button'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = { title: string; body: string; cta: string; onPress?: () => void }

/** C27 Backup status (pending): white group card with warning icon, title, body and a Secondary action. Never shows recovery words. */
export function BackupStatus({ title, body, cta, onPress }: Props) {
  const t = useTheme()
  const c = t.component.backupStatus
  return (
    <View style={{ gap: t.semantic.layout.fieldGap, padding: t.semantic.layout.screen.padding, borderRadius: t.semantic.shape.group, backgroundColor: c.bg, borderWidth: c.borderWidth }}>
      <Icon name="warning" size={t.component.icon.size.control} color={t.component.icon.status.warning} />
      <Text variant="section" color={c.title}>{title}</Text>
      <Text variant="body" color={c.body}>{body}</Text>
      <Button label={cta} variant="secondary" {...(onPress ? { onPress } : {})} />
    </View>
  )
}
