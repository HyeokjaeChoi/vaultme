import { expect, it } from 'vitest'
import { i18n, ko } from '../src'

it('resolves ko keys synchronously', () => {
  expect(i18n.t('start.create')).toBe(ko.start.create)
  expect(i18n.t('receive.qrLabel')).toBe('받기 주소 QR 코드')
})

it('has no banned terms (ux-terminology)', () => {
  const all = JSON.stringify(ko)
  for (const bad of ['전송', '송신', '가스비', '시드', '니모닉', 'Testnet']) expect(all).not.toContain(bad)
})

it('has the Redesign A send and review copy', () => {
  expect(i18n.t('send.recipientQuestion')).toBe('누구에게 보낼까요?')
  expect(i18n.t('send.amountQuestion')).toBe('얼마를 보낼까요?')
  expect(i18n.t('send.keypad.delete')).toBe('지우기')
  expect(i18n.t('review.title')).toBe('이대로 보낼까요?')
  expect(i18n.t('review.heroTo', { account: '계정 1' })).toBe('계정 1에서 아래 주소로 보내요')
  expect(i18n.t('review.heroTotal', { total: '0.050042 ETH' })).toBe('총 0.050042 ETH 차감 예상')
  expect(i18n.t('review.lookalike.title')).toBe('비슷한 주소예요')
  expect(i18n.t('review.ack')).toBe('확인했어요, 보내기')
  expect(i18n.t('send.preSend.faceId')).toBe('보내면 취소할 수 없어요 · 다음 단계에서 Face ID로 확인해요')
  expect(i18n.t('result.sending')).toBe('보내는 중이에요')
  expect(i18n.t('send.recipientLabel')).toBe('받는 주소')
  expect(i18n.t('review.recipient')).toBe('받는 주소')
  expect(i18n.t('review.fee')).toBe('예상 네트워크 수수료')
  expect(i18n.t('review.feeCap')).toBe('최대 수수료')
  expect(i18n.t('review.recalc')).toBe('다시 계산')
  expect(i18n.t('activity.today')).toBe('오늘')
})

it('has the S03/S04 backup copy', () => {
  expect(i18n.t('backup.title')).toBe('복구 구문')
  expect(i18n.t('backup.reveal')).toBe('탭해서 보기')
  expect(i18n.t('backup.done')).toBe('다 적었어요')
  expect(i18n.t('backup.check.title')).toBe('단어 확인')
  expect(i18n.t('backup.check.position', { n: 7 })).toBe('7번째 단어')
  expect(i18n.t('backup.check.confirm')).toBe('확인')
})

it('has the S05/S06 restore copy', () => {
  expect(i18n.t('restore.title')).toBe('지갑 복구')
  expect(i18n.t('restore.helper')).toBe('복구 구문 단어를 순서대로 입력하세요.')
  expect(i18n.t('restore.word', { n: 3 })).toBe('3번째 단어')
  expect(i18n.t('restore.unknownWord', { n: 3 })).toBe('3번째 단어가 복구 구문 단어 목록에 없어요')
  expect(i18n.t('restore.passphrase.row')).toBe('고급 · 패스프레이즈 입력')
  expect(i18n.t('restore.done.withPassphrase')).toBe('패스프레이즈로 복구했어요.')
  expect(i18n.t('restore.done.different')).toBe('다른 주소예요')
  expect(i18n.t('restore.done.title')).toBe('복구 완료')
  expect(i18n.t('restore.open')).toBe('지갑 열기')
})

it('has the C2b send result, detail and test-data copy', () => {
  expect(i18n.t('send.authPrompt')).toBe('보내려면 인증하세요')
  expect(i18n.t('send.pendingBlock.title')).toBe('진행 중인 보내기가 있어요')
  expect(i18n.t('testData.title')).toBe('테스트 데이터예요')
  expect(i18n.t('notBroadcast.title')).toBe('네트워크로 보내지 않았어요 (테스트)')
  expect(i18n.t('result.pendingBody')).toBe('네트워크 처리를 기다리는 중이에요.')
  expect(i18n.t('result.sendAgainWarn')).toBe('이미 네트워크에 보냈어요.\n같은 거래를 다시 보내지 마세요.')
  expect(i18n.t('result.unknownBody')).toBe('다시 보내지 말고 상태를 확인해 주세요.')
  expect(i18n.t('detail.auto')).toBe('자동으로 다시 확인해요.')
  expect(i18n.t('detail.lastChecked', { time: '09:41' })).toBe('마지막 확인 09:41')
  expect(i18n.t('detail.etherscan')).toBe('Etherscan에서 보기')
  expect(i18n.t('detail.clearTest')).toBe('테스트 거래 지우기')
  expect(i18n.t('detail.clearTitle')).toBe('테스트 거래를 지울까요?')
})

it('has the C3 real-state copy (#44)', () => {
  expect(i18n.t('send.needsReview.title')).toBe('내용이 바뀌었어요')
  expect(i18n.t('send.blocked.title')).toBe('수수료가 너무 높아요')
  expect(i18n.t('review.reconfirm')).toBe('다시 검토')
  expect(i18n.t('activity.updatedAt', { time: '09:41' })).toBe('마지막 업데이트 09:41')
  expect(i18n.t('activity.included')).toBe('블록에 포함됨 (확정 대기)')
  expect(i18n.t('updateRequired.body')).toContain('자산은 블록체인에 그대로 있어요.')
  expect(i18n.t('detail.failed.body')).toBe('보내려던 금액은 나가지 않았어요.\n네트워크 수수료는 나갔어요.')
  expect(i18n.t('updateRequired.cta')).toBe('스토어에서 업데이트')
})

it('has the Redesign B phase 2 copy (home, asset, onboarding, settings, brand)', () => {
  expect(i18n.t('home.recent')).toBe('최근 내역')
  expect(i18n.t('home.introTitle')).toBe('Sepolia 테스트넷 지갑이에요')
  expect(i18n.t('home.emptyTitle')).toBe('아직 자산이 없어요')
  expect(i18n.t('asset.history')).toBe('이 자산의 내역')
  expect(i18n.t('precheck.title')).toBe('시작하기 전에 확인해 주세요')
  expect(i18n.t('backup.ack')).toBe('12단어를 순서대로 종이에 적었어요')
  expect(i18n.t('settings.group.info')).toBe('정보')
  expect(i18n.t('settings.licenses')).toBe('오픈소스 라이선스')
  expect(i18n.t('settings.phraseBody', { auth: i18n.t('settings.phraseAuth.faceId') })).toBe('Face ID로 확인했어요. 화면을 캡처하지 마세요.\n앱을 벗어나면 다시 가려져요.')
  expect(i18n.t('lock.checking.faceId')).toBe('Face ID로 확인하는 중이에요')
  expect(i18n.t('settings.deviceScreen.title')).toBe('기기 보안 안내')
})

it('has the seamless follow-up copy (2026-10-17)', () => {
  expect(i18n.t('backup.check.wrong', { n: 7 })).toBe('7번째 단어가 달라요')
  expect(i18n.t('home.faucet.title')).toBe('테스트 ETH 받기')
  expect(i18n.t('busy.restore')).toBe('복구하는 중…')
  expect(i18n.t('home.introCta')).toBe('확인')
})
