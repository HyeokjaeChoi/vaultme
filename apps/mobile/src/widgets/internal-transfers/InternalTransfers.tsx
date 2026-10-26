// Figma: B-S41 내부 이동 (Flow 4 · Activity, #239): list 804:39671 / many 804:39832 / loading 804:40085 / error 804:40202 (dark 805:3260 / 805:3421 / 805:3674 / 805:3791); rows are Activity row 36:48
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { internalRow, type Internal } from '@/features/history'
import { useTheme } from '@/shared/theme'
import { AssetIcon, Block, Button, RowBadge, SectionBand, StatusNotice, Text } from '@/shared/ui'

function Row({ i }: { i: ReturnType<typeof internalRow> }) {
  const { t } = useTranslation()
  const th = useTheme()
  const label = t(i.title)
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${i.detail}, ${i.amount}`}
      style={{
        minHeight: th.component.rowB.height,
        flexDirection: 'row',
        alignItems: 'center',
        gap: th.semantic.layout.rowGap,
      }}
    >
      <View style={{ width: th.primitive.size.avatar_md, height: th.primitive.size.avatar_md }}>
        <AssetIcon symbol="ETH" size={th.primitive.size.avatar_md} />
        {i.ok ? null : (
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              transform: [{ translateX: th.component.rowBadge.ring }, { translateY: th.component.rowBadge.ring }],
            }}
          >
            <RowBadge kind="failed" />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="rowTitle" color={th.component.activityRow.title}>
          {label}
        </Text>
        <Text variant="caption" color={th.semantic.text.tertiary}>
          {i.detail}
        </Text>
      </View>
      {/* A failed call moved nothing: the amount it named is grey, as in the history rows. */}
      <Text
        variant="headline"
        tabular
        color={i.ok ? th.component.activityRow.amount : th.semantic.text.tertiary}
        style={{ textAlign: 'right', flexShrink: 1 }}
      >
        {i.amount}
      </Text>
    </View>
  )
}

/** Three bars-pairs as drawn in Figma 804:40085 (label bar, then a full-width bar). ponytail: static, no pulse; add the SkeletonRow pulse if the owner wants one. */
function Skeleton() {
  const th = useTheme()
  const c = th.component.skeleton
  const bar = {
    backgroundColor: c.bg,
    borderRadius: c.radius,
    height: th.primitive.space[3] + th.primitive.space['0_5'],
  }
  return (
    <View aria-hidden style={{ gap: th.primitive.space[2] }}>
      {[0, 1, 2].map((n) => (
        <View key={n} style={{ paddingVertical: th.primitive.space[3], gap: th.primitive.space[2] }}>
          <View style={{ ...bar, width: th.primitive.space[20] + th.primitive.space[5] }} />
          <View style={bar} />
        </View>
      ))}
    </View>
  )
}

/**
 * Every internal ETH transfer of the transaction (ADR-0015, CONTEXT.md "내부 이동"), a Block below the detail rows. Hidden when there are none
 * (Etherscan can lag a fresh block). A failed read affects only this block: a banner and a retry button (owner decision Q4, #239).
 */
export function InternalTransfers({ internal, retry }: { internal: Internal; retry: () => void }) {
  const { t } = useTranslation()
  const th = useTheme()
  if (internal.status === 'ok' && internal.items.length === 0) return null
  return (
    <>
      <SectionBand />
      <Block title={t('detail.internal.title')}>
        {internal.status === 'loading' ? (
          <View accessible accessibilityLabel={t('detail.internal.loading')} accessibilityLiveRegion="polite">
            <Skeleton />
          </View>
        ) : internal.status === 'failed' ? (
          <View style={{ gap: th.semantic.layout.fieldGap, alignItems: 'flex-start' }}>
            <StatusNotice tier="banner" tone="danger" title="" body={t('detail.internal.failed')} />
            <Button label={t('common.retry')} variant="secondary" size="md" onPress={retry} />
          </View>
        ) : (
          <>
            {/* "The ETH moved here" is true only if one of them went through. */}
            {internal.items.some((i) => i.ok) ? (
              <Text variant="bodySmall" color={th.semantic.text.tertiary}>
                {t('detail.internal.note')}
              </Text>
            ) : null}
            {internal.items.map((i, n) => (
              <Row key={n} i={internalRow(i)} />
            ))}
          </>
        )}
      </Block>
    </>
  )
}
