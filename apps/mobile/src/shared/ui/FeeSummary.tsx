// Figma: Fee summary 40:41
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = {
  title: string
  fee?: string
  fiat?: string
  note?: string
  /** Stale and Insufficient use their own text color. */
  state?: 'fresh' | 'stale' | 'insufficient' | 'unavailable'
  message?: string
  action?: string
  onAction?: () => void
}

/** C12 Fee summary. Native-asset fee, optional fiat estimate (absent on testnet), freshness message and action. Height follows content. */
export function FeeSummary({ title, fee, fiat, note, state = 'fresh', message, action, onAction }: Props) {
  const t = useTheme()
  const c = t.component.feeSummary
  const msgColor = state === 'stale' ? c.stale : state === 'insufficient' ? c.insufficient : c.note
  return (
    <View style={{ gap: t.semantic.layout.fieldGap, borderRadius: c.radius }}>
      <Text variant="label" color={c.title}>{title}</Text>
      {fee ? <Text variant="row" color={c.amount}>{fee}</Text> : null}
      {message ? <Text variant="body" color={msgColor}>{message}</Text> : null}
      {action ? (
        <Text variant="body" accessibilityRole="link" onPress={onAction} color={state === 'insufficient' ? c.insufficient : t.semantic.text.link}>{action}</Text>
      ) : null}
      {fiat ? <Text variant="body" color={c.note}>{fiat}</Text> : null}
      {note ? <Text variant="body" color={c.note}>{note}</Text> : null}
    </View>
  )
}
