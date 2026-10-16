import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useTheme } from '@/shared/theme'
import {
  ActionRow, ActivityRow, AmountDisplay, AssetRow, BottomSheet, Button, Chip, DateHeader, EmptyState, Input, Keypad, ListItem, PortfolioBalance, Screen, ScreenHeader,
  SecretGrid, SectionHeader, Segmented, SensitiveReveal, SkeletonRow, StatusHero, StatusNotice, SummaryRow, Switch, Text,
} from '@/shared/ui'
import { goBack } from '@/shared/lib/nav'
import { biometryType, getBackupDone, hasPhrase, openKv, setBackupDone } from '@/shared/storage'

// Dev-only gallery for the shared UI, incl. all Redesign B components (B Foundation 398:77) (not linked from the app). Words are placeholders.
const words = ['word', 'word', 'word', 'word', 'word', 'word'] as const

// Dev-only smoke check through shared/storage: encrypted MMKV round-trip + keychain status. No secrets shown.
function NativeSmoke() {
  const [line, setLine] = useState('native: …')
  useEffect(() => {
    const run = async () => {
      try {
        await openKv()
        const before = getBackupDone()
        setBackupDone(!before)
        const mmkv = getBackupDone() === !before ? 'ok' : 'FAIL'
        setBackupDone(before)
        const has = await hasPhrase()
        const bio = await biometryType()
        setLine(`native: mmkv ${mmkv} / keychain phrase ${has ? 'yes' : 'no'} / biometry ${bio ?? 'none'}`)
      } catch (e) {
        setLine(`native: error ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    void run()
  }, [])
  return <Text variant="caption">{line}</Text>
}

export function KitPage() {
  const th = useTheme()
  const { t } = useTranslation()
  const [seg, setSeg] = useState<'12' | '24'>('12')
  const [on, setOn] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [chip, setChip] = useState('50')
  return (
    <Screen header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}>
      <Text variant="title1">Kit</Text>
      {__DEV__ ? <NativeSmoke /> : null}
      <View>
        <Text variant="displayL" tabular>Display L 0.05</Text>
        <Text variant="displayM" tabular>Display M 0.05</Text>
        <Text variant="title1">Title 1 화면 제목</Text>
        <Text variant="title2">Title 2 섹션 제목</Text>
        <Text variant="title3">Title 3 시트 제목</Text>
        <Text variant="headline">Headline 행 제목</Text>
        <Text variant="body">Body 본문 16/24</Text>
        <Text variant="bodySmall">Body Small 보조 설명</Text>
        <Text variant="label">Label 필드 라벨</Text>
        <Text variant="caption">Caption 날짜 부가 정보</Text>
        <Text variant="address">0x1234 5678 9abc def0</Text>
      </View>
      <PortfolioBalance label="Sepolia 테스트넷" value="0.05 ETH" note="테스트넷 자산은 시장 가격이 없어요." />
      <PortfolioBalance unavailable label="총 평가금액" value="표시할 수 없어요" note="수량은 아래에서 보세요." />
      <ActionRow primary={{ label: '보내기', icon: 'send' }} secondary={{ label: '받기', icon: 'receive' }} />
      <View>
        <SectionHeader title="자산" link="모두 보기" />
        <AssetRow name="Sepolia ETH" symbol="ETH" balance="0.05" />
        <AssetRow name="USD Coin" symbol="USDC" balance="12.5" />
        <DateHeader date="10월 16일 (금)" />
        <ActivityRow title="보내는 중" detail="Sepolia ETH · 09:41" time="09:41" amount="-0.05 ETH" kind="send" status="pending" statusLabel="처리 중" />
        <ActivityRow title="받음" detail="USDC · 08:10" time="08:10" amount="+12.5 USDC" kind="receive" status="confirmed" statusLabel="확정" />
        <ActivityRow title="보내기 실패" detail="ETH · 07:00" time="07:00" amount="-0.01 ETH" kind="send" status="failed" statusLabel="실패" />
        <ListItem title="복구 구문 보기" trailing={{ kind: 'disclosure', text: '켜짐' }} onPress={() => undefined} />
        <ListItem title="알림" trailing={{ kind: 'custom', node: <Switch label="알림" value={on} onValueChange={setOn} /> }} />
      </View>
      <View>
        <SummaryRow label="네트워크" value="Sepolia" />
        <SummaryRow format="address" label="받는 주소" value="0x1111111111111111111111111111111111111111" />
        <SummaryRow format="total" label="예상 총 차감액" value="0.0501 ETH" />
      </View>
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <StatusNotice tone="info" title="주소 형식만 확인했어요" body="받는 사람이 맞는지는 직접 확인해 주세요." />
        <StatusNotice tone="warning" title="보내면 취소할 수 없어요" body="다음 단계에서 Face ID로 확인해요." />
        <StatusNotice tone="danger" title="보낼 수 있는 금액보다 많아요" />
      </View>
      <AmountDisplay amount="0.05" ticker="ETH" sub="보낼 수 있는 금액 1.284732 ETH" />
      <AmountDisplay error amount="2" ticker="ETH" sub="보낼 수 있는 금액보다 많아요" />
      <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
        {(['25', '50', '100'] as const).map((v) => <Chip key={v} label={v === '100' ? '전액' : `${v}%`} selected={chip === v} onPress={() => setChip(v)} />)}
        <Chip label="비활성" disabled />
      </View>
      <Keypad onKey={() => undefined} labels={{ dot: '소수점', delete: '지우기' }} />
      <Keypad assetKey="doubleZero" onKey={() => undefined} labels={{ dot: '소수점', delete: '지우기' }} />
      <StatusHero tone="pending" title="보내는 중이에요" body="네트워크 처리를 기다리는 중이에요" />
      <StatusHero tone="failed" title="보내지 못했어요" body="수수료가 나갔을 수 있어요." />
      <SkeletonRow />
      <EmptyState title="아직 거래가 없어요" body="받기 주소를 공유하면 여기에 거래가 보여요." action={{ label: '받기 주소 보기' }} />
      <SecretGrid words={null} />
      <SecretGrid words={Array.from({ length: 12 }, (_, i) => `단어${i + 1}`)} />
      <Segmented options={[{ value: '24', label: '24단어' }, { value: '12', label: '12단어' }]} value={seg} onChange={setSeg} />
      <Switch label="switch" value={on} onValueChange={setOn} />
      <Input label="단어 1" placeholder="단어 입력" />
      <Input label="단어 2" error="형식이 맞지 않아요" />
      <SensitiveReveal words={revealed ? words : null} onReveal={() => setRevealed(true)} />
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Button label="Primary" />
        <Button label="Secondary" variant="secondary" />
        <Button label="Ghost" variant="ghost" />
        <Button label="Disabled" disabled />
        <Button label="Primary md" size="md" />
        <Button label="Secondary sm" size="sm" variant="secondary" />
        <Button label="아주 긴 버튼 라벨은 두 줄까지 줄바꿈되어야 하고 그 이상은 잘려요 아주 긴 버튼 라벨" />
        <Button label="시트 열기" variant="ghost" onPress={() => setSheet(true)} />
      </View>
      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="이대로 보낼까요?"
        actions={<><Button label="수정" variant="ghost" onPress={() => setSheet(false)} /><Button label="확인하고 보내기" onPress={() => setSheet(false)} /></>}
      >
        <Text color={th.semantic.text.secondary}>시트 본문 Body 16/24</Text>
      </BottomSheet>
    </Screen>
  )
}
