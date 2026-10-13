import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { resolveReview } from '@/entities/transaction/review'
import { diffGroups, groupAddress } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { textStyle } from '@/shared/theme/fonts'
import { BottomSheet, Button, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { ReviewPanel } from '@/widgets/review-panel/ReviewPanel'

const SHOWN_GROUPS = 4 // sheet compares only the leading chunks, then "…"

/** Info notice body of the address-check sheet: previous vs current address, only differing chunks marked. */
function Compare({ current, previous }: { current: string; previous: string }) {
  const { t } = useTranslation()
  const th = useTheme()
  const fg = th.component.statusNotice.info.fg
  const diff = diffGroups(current, previous)
  const mark = { ...textStyle({ ...th.semantic.typography.label }), color: th.semantic.status.danger.fg, textDecorationLine: 'underline' as const }
  const cut = (a: string) => groupAddress(a).slice(0, SHOWN_GROUPS)
  return (
    <View>
      <Text variant="body" color={fg}>{`${t('review.lookalike.previous')}   ${cut(previous).join(' ')} …`}</Text>
      <Text variant="body" color={fg}>
        {`${t('review.lookalike.current')}   `}
        {cut(current).map((g, i) => (
          <Text key={i} color={fg}>
            {i > 0 ? ' ' : ''}
            <Text style={diff.includes(i) ? mark : undefined}>{g}</Text>
          </Text>
        ))}
        {' …'}
      </Text>
    </View>
  )
}

/** R-S22 검토. `risk=1` = R-S22L look-alike: confirm opens the address-check sheet. `sheet=1` opens it on arrival (R-S22L+Sheet). Confirm is inert: no signing in C2a. */
export function ReviewPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { risk, sheet: sheetParam, to, amount } = useLocalSearchParams<{ risk?: string; sheet?: string; to?: string; amount?: string }>()
  const values = resolveReview(to, amount, risk === '1')
  const isRisk = values.previous !== null
  const [sheet, setSheet] = useState(isRisk && sheetParam === '1')
  // Same route re-opened with ?sheet=1 keeps this screen mounted, so follow the param.
  useEffect(() => {
    if (isRisk && sheetParam === '1') setSheet(true)
  }, [isRisk, sheetParam])
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => router.back()} />}
      footer={<Button label={t('review.confirm')} onPress={() => isRisk && setSheet(true)} />}
    >
      <ReviewPanel values={values} onEditRecipient={() => router.dismissTo('/send')} onEditAmount={() => router.back()} />
      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title={t('review.lookalike.sheetTitle')}
        actions={
          <>
            <Button label={t('common.cancel')} onPress={() => setSheet(false)} />
            <Button label={t('review.lookalike.proceed')} variant="ghost" onPress={() => setSheet(false)} />
          </>
        }
      >
        <Text color={th.semantic.text.secondary}>{t('review.lookalike.sheetBody')}</Text>
        <StatusNotice tone="info" title={t('review.lookalike.compareTitle')} body={<Compare current={values.recipient} previous={values.previous ?? values.recipient} />} />
      </BottomSheet>
    </Screen>
  )
}
