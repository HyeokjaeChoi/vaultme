// Figma: B-S21 QR scan 618:102942 (test QR 618:103021, invalid QR 618:103107, camera denied 618:103195), B-S21+QRX chain mismatch sheet 618:103288
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { CHAIN } from '@vaultme/wallet-core'
import { account } from '@/entities/account/fixtures'
import { setScanResult } from '@/features/send'
import { useTestMode } from '@/shared/chain/useTestMode'
import { haptic } from '@/shared/lib/haptics'
import { goBack } from '@/shared/lib/nav'
import { chainIdCopula, parseAddressQr } from '@/shared/lib/qrAddress'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, EmptyState, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

/** An invalid or wrong-chain code is ignored for this long after it was seen: the camera reports the same code every frame (issue #64 Q10: 2 s notice). */
const NOTICE_MS = 2000
// Figma Viewfinder 280 x 280 (no size token); the four brackets are 40 (size.avatar_md), borderWidth.focus, radius.lg.
const VIEWFINDER = 280

/** Corner brackets of the viewfinder (Figma Bracket TL / TR / BL / BR). */
function Brackets({ color }: { color: string }) {
  const t = useTheme()
  const size = t.primitive.size.avatar_md
  const w = t.primitive.borderWidth.focus
  const r = t.primitive.radius.lg
  const base = { position: 'absolute', width: size, height: size, borderColor: color } as const
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View style={{ ...base, top: 0, left: 0, borderTopWidth: w, borderLeftWidth: w, borderTopLeftRadius: r }} />
      <View style={{ ...base, top: 0, right: 0, borderTopWidth: w, borderRightWidth: w, borderTopRightRadius: r }} />
      <View style={{ ...base, bottom: 0, left: 0, borderBottomWidth: w, borderLeftWidth: w, borderBottomLeftRadius: r }} />
      <View style={{ ...base, bottom: 0, right: 0, borderBottomWidth: w, borderRightWidth: w, borderBottomRightRadius: r }} />
    </View>
  )
}

/**
 * B-S21 QR 스캔 (issue #64). The camera is asked for only when this screen opens from the scan icon (no pre-prompt screen); denied shows the in-screen state.
 * A valid address QR returns to B-S20a through `setScanResult` (same checks as a pasted address run there and on Review). An invalid code stays on the camera
 * with a 2 s notice and a warning haptic; a code for another chain opens a sheet with one button (no override). Address only: amounts in the QR are ignored.
 * Fake chain (simulator, no camera): a "테스트 QR" button feeds the public test address through the same path.
 * `?scan=denied|invalid|mismatch` is a __DEV__ capture override (same pattern as `backedUp=1`).
 */
export function ScanPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const test = useTestMode()
  const { scan: devState } = useLocalSearchParams<{ scan?: string }>()
  const dev = __DEV__ ? devState : undefined
  const [perm, requestPerm, refreshPerm] = useCameraPermissions()
  const [invalid, setInvalid] = useState(dev === 'invalid')
  const [wrongChain, setWrongChain] = useState<number | null>(dev === 'mismatch' ? 1 : null)
  const last = useRef<{ data: string; at: number } | null>(null)
  const done = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])
  // First visit: ask now (the user just tapped the scan icon). Back from Settings: read the permission again.
  const asked = useRef(false)
  useEffect(() => {
    if (perm?.status === 'undetermined' && perm.canAskAgain && !asked.current) {
      asked.current = true
      void requestPerm()
    }
  }, [perm, requestPerm])
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refreshPerm()
    })
    return () => sub.remove()
  }, [refreshPerm])

  const reject = useCallback((data: string) => {
    last.current = { data, at: Date.now() }
    haptic.warning()
  }, [])

  const onData = useCallback(
    (data: string) => {
      if (done.current) return
      const seen = last.current
      if (seen && seen.data === data && Date.now() - seen.at < NOTICE_MS) return
      const r = parseAddressQr(data)
      if (r.ok) {
        done.current = true
        haptic.success()
        setScanResult({ to: r.address, fromQr: true, hadAmount: r.hadAmount })
        goBack('/send')
        return
      }
      reject(data)
      if (r.error === 'wrongChain') {
        setWrongChain(r.chainId)
        return
      }
      setInvalid(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setInvalid(false), NOTICE_MS)
    },
    [reject],
  )

  const paste = async () => {
    if (done.current) return
    try {
      const text = (await Clipboard.getStringAsync()).trim().replace(/\s/g, '')
      done.current = true
      setScanResult({ to: text, fromQr: false, hadAmount: false })
      goBack('/send')
    } catch {
      // clipboard unavailable: stay here
    }
  }

  const denied = dev === 'denied' || (perm !== null && !perm.granted && perm.status !== 'undetermined')
  const header = (
    <ScreenHeader
      icon="close"
      backLabel={t('common.close')}
      onBack={() => goBack('/send')}
      chips={<NetworkChips />}
      {...(denied ? {} : { iconColor: th.semantic.text.onBrand })}
    />
  )
  const pasteButton = <Button variant="secondary" label={t('send.qr.pasteAddress')} onPress={() => void paste()} />

  if (denied) {
    return (
      <Screen
        topGap="group"
        gap="group"
        header={header}
        footer={
          <>
            <Button label={t('send.qr.denied.openSettings')} onPress={() => void Linking.openSettings()} />
            {pasteButton}
          </>
        }
      >
        <View style={{ paddingVertical: th.primitive.space[2] }}>
          <Text variant="title1" accessibilityRole="header">{t('send.qr.title')}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState bold="warning" title={t('send.qr.denied.title')} body={t('send.qr.denied.body')} />
        </View>
      </Screen>
    )
  }

  const onBrand = th.semantic.text.onBrand
  const pad = th.semantic.layout.screen.padding
  return (
    <>
      <StatusBar style="light" />
      <Screen
        bleed
        bg={th.component.overlay.scrimBg}
        footerLine={false}
        gap="none"
        header={header}
        footer={pasteButton}
      >
        <View style={{ gap: th.semantic.layout.groupGap, paddingTop: th.semantic.layout.groupGap }}>
          <View style={{ paddingHorizontal: pad, paddingVertical: th.primitive.space[2] }}>
            <Text variant="title1" accessibilityRole="header" color={onBrand}>{t('send.qr.title')}</Text>
          </View>
          <View style={{ alignItems: 'center', paddingVertical: th.semantic.layout.sectionGap.product }}>
            <View style={{ width: VIEWFINDER, height: VIEWFINDER, overflow: 'hidden', borderRadius: th.primitive.radius.lg }}>
              {perm?.granted ? (
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={wrongChain === null ? (e) => onData(e.data) : undefined}
                />
              ) : null}
              <Brackets color={onBrand} />
            </View>
          </View>
          {invalid ? (
            <View style={{ paddingBottom: th.semantic.layout.groupGap }}>
              <StatusNotice tier="banner" tone="danger" title="" body={t('send.qr.invalid')} />
            </View>
          ) : null}
          <View style={{ gap: th.semantic.layout.fieldGap, paddingHorizontal: pad }}>
            <Text variant="body" color={onBrand} style={{ textAlign: 'center' }}>{t('send.qr.hint')}</Text>
            <Text variant="fact" color={onBrand} style={{ textAlign: 'center' }}>{`${CHAIN.name} · ${CHAIN.id}`}</Text>
          </View>
          {test ? (
            <View style={{ alignItems: 'center' }}>
              <Button size="md" variant="secondary" label={t('send.qr.testQr')} onPress={() => onData(account.address)} />
            </View>
          ) : null}
        </View>
      </Screen>
      <BottomSheet
        visible={wrongChain !== null}
        onClose={() => setWrongChain(null)}
        title={t('send.qr.wrongChain.title')}
        primary={{ label: t('send.qr.wrongChain.back'), onPress: () => setWrongChain(null) }}
      >
        {wrongChain !== null ? (
          <Text variant="body" color={th.semantic.text.secondary}>
            {t('send.qr.wrongChain.body', { chainId: wrongChain, copula: chainIdCopula(wrongChain), sepolia: CHAIN.id })}
          </Text>
        ) : null}
      </BottomSheet>
    </>
  )
}
