// Figma: R-S20A 누구에게 보낼까요? (423:848 empty, 423:885 valid)
import * as Clipboard from 'expo-clipboard'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { AccessibilityInfo, Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { takeScanResult, useRecents } from '@/features/send'
import { isAddressFormat } from '@/shared/lib/address'
import { goBack } from '@/shared/lib/nav'
import { dateLabel } from '@/shared/lib/time'
import { showAmount } from '@/shared/lib/amount'
import { useTheme } from '@/shared/theme'
import { Button, Icon, RecipientField, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { AddressText } from '@/shared/ui/AddressBlock'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

/**
 * R-S20A 누구에게 보낼까요?. Paste fills the field from the clipboard, 지우기 empties it (shown when it has a value). The scan icon (empty field only) opens B-S21; a valid QR comes back through `takeScanResult`
 * and fills the field like a paste, with the Fact label "QR에서 가져온 주소" (and the "금액은 직접 입력해요" note when the QR carried an amount) until the text is edited. Scanned addresses are never added to recents. A valid format only says the format is right.
 * `?qr=1|amount` is a __DEV__ capture override for the from-QR frames (with `to`).
 * 최근 보낸 주소: up to 3 recipients this device sent to (local only, never from the network), full address in 4-char groups; tapping one fills the field.
 */
export function SendPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { to: initial } = useLocalSearchParams<{ to?: string }>()
  const { qr: devQr } = useLocalSearchParams<{ qr?: string }>()
  const [to, setTo] = useState(initial ?? '')
  // Address that came from a QR (and whether the QR carried an amount). The label stays only while the field still holds exactly that address.
  const [qr, setQr] = useState<{ address: string; hadAmount: boolean } | null>(
    __DEV__ && devQr && initial ? { address: initial, hadAmount: devQr === 'amount' } : null,
  )
  useFocusEffect(
    useCallback(() => {
      const r = takeScanResult()
      if (!r) return
      setTo(r.to)
      setQr(r.fromQr ? { address: r.to, hadAmount: r.hadAmount } : null)
      if (r.fromQr) AccessibilityInfo.announceForAccessibility(t('send.qr.announce')) // VoiceOver: the scan screen closes with no other cue
    }, [t]),
  )
  const recents = useRecents()
  const valid = isAddressFormat(to)
  const fromQr = qr !== null && to === qr.address
  const paste = async () => {
    try {
      setTo((await Clipboard.getStringAsync()).trim().replace(/\s/g, ''))
      setQr(null)
    } catch {
      // clipboard unavailable: the field stays as it is
    }
  }
  return (
    <Screen
      topGap="group"
      gap="group"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} chips={<NetworkChips />} />}
      footer={
        <Button
          label={t('send.next')}
          disabled={!valid}
          onPress={() => router.push({ pathname: '/send/amount', params: { to } })}
        />
      }
    >
      <View style={{ paddingVertical: th.primitive.space[2] }}>
        <Text variant="title1" accessibilityRole="header">
          {t('send.recipientQuestion')}
        </Text>
      </View>
      <View style={{ paddingVertical: th.primitive.space[2] }}>
        <RecipientField
          label={t('send.recipientLabel')}
          value={to}
          onChangeText={(v) => {
            setTo(v)
            setQr(null)
          }}
          placeholder={t('send.recipientPlaceholder')}
          actions={[
            to
              ? {
                  label: t('send.clear'),
                  onPress: () => {
                    setTo('')
                    setQr(null)
                  },
                }
              : { label: t('send.paste'), onPress: () => void paste() },
          ]}
          {...(to ? {} : { scan: { label: t('send.scan'), onPress: () => router.push('/send/scan') } })}
        />
      </View>
      {fromQr ? (
        <View style={{ paddingVertical: th.semantic.layout.fieldGap }}>
          <Text variant="caption" color={th.semantic.text.tertiary}>
            {t('send.qr.source')}
          </Text>
        </View>
      ) : null}
      {valid ? <StatusNotice tone="info" title={t('send.recipientHint')} /> : null}
      {valid && fromQr && qr?.hadAmount ? <StatusNotice tone="info" title={t('send.qr.amountNote')} /> : null}
      {!to && recents.length ? (
        <View style={{ gap: th.semantic.layout.rowGap, paddingTop: th.primitive.space[2] }}>
          <Text variant="label" color={th.semantic.text.tertiary} accessibilityRole="header">
            {t('send.recent')}
          </Text>
          {recents.map((r) => (
            <Pressable
              key={r.address}
              accessibilityRole="button"
              onPress={() => setTo(r.address)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: th.semantic.layout.rowGap,
                minHeight: th.primitive.size.touch_min,
                paddingVertical: th.primitive.space[2],
              }}
            >
              <View style={{ flex: 1, gap: th.primitive.space[1] }}>
                <AddressText address={r.address} />
                <Text variant="caption" color={th.semantic.text.tertiary}>
                  {t('send.recentRow', {
                    date: dateLabel(r.at).replace(/ \(.\)$/, ''),
                    amount: showAmount(r.amount, r.asset, 'floor'),
                  })}
                </Text>
              </View>
              <Icon name="disclosure" size={th.component.icon.size.control} color={th.component.icon.navigation.fg} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  )
}
