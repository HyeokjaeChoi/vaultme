// Figma: B-S23 Pending / actions 888:5799, S41 888:5913, sped up 888:6568, cancel requested 888:6647, processed before cancel 888:6776 / 888:6852
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { processedBeforeCancel } from '@/features/send'
import type { PendingTx } from '@/shared/storage'
import { useTheme } from '@/shared/theme'
import { StatusNotice } from '@/shared/ui'
import { Cancel } from './Cancel'
import { SpeedUp } from './SpeedUp'

/**
 * The area under the status of S23 and S41 (ADR-0031): an info line about the last replacement, and while Pending (and before a cancel) "속도 올리기" + "거래 취소" side by side.
 * After a cancel is sent both buttons are gone and the state stays Pending: the line says the cancel was only requested. When the original was processed first the line says so.
 */
export function PendingActions({ tx, onDone }: { tx: PendingTx; onDone: () => void }) {
  const { t } = useTranslation()
  const th = useTheme()
  const pending = tx.state === 'Pending'
  const line = processedBeforeCancel(tx)
    ? 'cancel.processedFirstLine'
    : !pending
      ? null
      : tx.kind === 'speedUp'
        ? 'speedUp.sentLine'
        : tx.kind === 'cancel'
          ? 'cancel.requestedLine'
          : null
  const buttons = pending && tx.kind !== 'cancel'
  if (!line && !buttons) return null
  return (
    <View
      style={{
        paddingHorizontal: th.semantic.layout.screen.padding,
        paddingBottom: buttons ? th.semantic.layout.sectionGap.product : 0,
        gap: th.semantic.layout.fieldGap,
      }}
    >
      {line ? <StatusNotice tone="info" title={t(line)} /> : null}
      {buttons ? (
        <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
          <SpeedUp tx={tx} onDone={onDone} />
          <Cancel tx={tx} onDone={onDone} />
        </View>
      ) : null}
    </View>
  )
}
