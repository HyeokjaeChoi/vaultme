import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { review } from '@/entities/transaction/fixtures'
import { diffGroups, groupAddress } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { textStyle } from '@/shared/theme/fonts'
import { BottomSheet, Button, ReviewFooter, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { ReviewPanel } from '@/widgets/review-panel/ReviewPanel'

const SHOWN_GROUPS = 4 // sheet compares only the leading chunks, then "…"

/** Info notice body of the address-check sheet: previous vs current address, only differing chunks marked. */
function Compare() {
  const { t } = useTranslation()
  const th = useTheme()
  const fg = th.component.statusNotice.info.fg
  const diff = diffGroups(review.lookalike, review.recipient)
  const mark = { ...textStyle({ ...th.semantic.typography.label }), color: th.semantic.status.danger.fg, textDecorationLine: 'underline' as const }
  const cut = (a: string) => groupAddress(a).slice(0, SHOWN_GROUPS)
  return (
    <View>
      <Text variant="body" color={fg}>{`${t('review.lookalike.previous')}   ${cut(review.recipient).join(' ')} …`}</Text>
      <Text variant="body" color={fg}>
        {`${t('review.lookalike.current')}   `}
        {cut(review.lookalike).map((g, i) => (
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

/** S22 검토. `risk=1` = S22L lookalike (High risk): confirm opens the address-check sheet. Confirm is inert: no signing in C2a. */
export function ReviewPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { risk } = useLocalSearchParams<{ risk?: string }>()
  const isRisk = risk === '1'
  const [sheet, setSheet] = useState(false)
  return (
    <Screen
      footer={
        <ReviewFooter>
          <Button label={t('review.confirm')} icon="send" onPress={() => isRisk && setSheet(true)} />
          <Button label={t('review.edit')} variant="secondary" onPress={() => router.back()} />
        </ReviewFooter>
      }
    >
      <ScreenHeader title={t('review.title')} backLabel={t('common.back')} onBack={() => router.back()} />
      <ReviewPanel risk={isRisk} />
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
        <StatusNotice tone="info" title={t('review.lookalike.compareTitle')} body={<Compare />} />
      </BottomSheet>
    </Screen>
  )
}
