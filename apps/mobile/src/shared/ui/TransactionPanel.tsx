// Figma: Transaction panel 18:46 (State=Default / High risk 313:80)
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { AddressText } from './AddressBlock'
import { Text } from './Text'

type Props = {
  accountLabel: string
  account: string
  networkLabel: string
  network: string
  heading: string
  status: string
  risk?: boolean
  amount: string
  recipientLabel: string
  recipient: string
  /** Indexes of 4-char address groups to mark (lookalike). */
  highlight?: number[]
  feeLabel: string
  fee: string
  totalLabel: string
  total: string
  note: string
  notice: ReactNode
  detailsLabel: string
}

function Meta({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const t = useTheme()
  return (
    <View accessible accessibilityLabel={`${label}, ${value}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.semantic.layout.fieldGap }}>
      <Text variant="body" color={t.semantic.text.secondary} style={{ flex: 1 }}>{label}</Text>
      <Text variant={strong ? 'row' : 'body'} style={{ flex: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  )
}

/**
 * C15 Transaction panel: flat white card. Account, network, heading, status line, amount, full recipient,
 * estimated fee, total, check scope and a notice. Padding is transactionPanel.paddingMobile (Figma master 18:46 binds it).
 */
export function TransactionPanel(p: Props) {
  const t = useTheme()
  const c = t.component.transactionPanel
  return (
    <View style={{ gap: t.semantic.layout.fieldGap, padding: c.paddingMobile, borderRadius: c.radius, backgroundColor: c.bg, borderWidth: c.borderWidth, borderColor: c.border }}>
      <Meta label={p.accountLabel} value={p.account} />
      <Meta label={p.networkLabel} value={p.network} />
      <Text variant="title" accessibilityRole="header">{p.heading}</Text>
      <Text variant="label" color={p.risk ? t.semantic.status.danger.fg : t.semantic.text.secondary}>{p.status}</Text>
      <Text variant="reviewAmount" color={c.value}>{p.amount}</Text>
      <Text variant="label" color={c.label}>{p.recipientLabel}</Text>
      <AddressText address={p.recipient} color={c.address} {...(p.highlight ? { highlight: p.highlight } : {})} />
      <View style={{ height: c.sectionDividerWidth, backgroundColor: c.divider }} />
      <Meta label={p.feeLabel} value={p.fee} />
      <Meta label={p.totalLabel} value={p.total} strong />
      <Text variant="body" color={t.semantic.text.secondary}>{p.note}</Text>
      {p.notice}
      <Text variant="body" color={t.semantic.text.link}>{p.detailsLabel}</Text>
    </View>
  )
}
