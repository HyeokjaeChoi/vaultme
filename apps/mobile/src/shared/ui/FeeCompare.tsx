// Figma: B/Fee compare 891:6915
import { View } from 'react-native'
import { useTheme } from '../theme'
import { StatusNotice } from './StatusNotice'
import { SummaryRow } from './SummaryRow'

type Props = {
  /** The notice on top (banner): info by default; `danger` with a title for a blocking reason (ETH short, Figma 888:6136). */
  notice: string
  noticeTitle?: string
  noticeTone?: 'info' | 'warning' | 'danger'
  currentLabel: string
  currentValue: string
  /** Without the new row ("Show new fee" off, the cancel sheet) only the first row shows. */
  newLabel?: string
  newValue?: string
  /** The difference under the new fee (Product B/Label). */
  newSub?: string
}

/** Fee comparison of the speed-up and cancel sheets: notice, current fee row, new fee row (emphasis) with the difference. Built from the notice and the detail row. */
export function FeeCompare({
  notice,
  noticeTitle = '',
  noticeTone = 'info',
  currentLabel,
  currentValue,
  newLabel,
  newValue,
  newSub = '',
}: Props) {
  const t = useTheme()
  return (
    <View style={{ gap: t.semantic.layout.fieldGap, alignSelf: 'stretch' }}>
      <StatusNotice tier="banner" tone={noticeTone} title={noticeTitle} body={notice} />
      <SummaryRow label={currentLabel} value={currentValue} />
      {newLabel !== undefined && newValue !== undefined ? (
        <SummaryRow format="total" label={newLabel} value={newValue} sub={newSub} />
      ) : null}
    </View>
  )
}
