import { expect, it } from 'vitest'
import { i18n, ko } from '../src'

it('resolves ko keys synchronously', () => {
  expect(i18n.t('start.create')).toBe(ko.start.create)
  expect(i18n.t('receive.qrPlaceholder')).toBe('임시 QR')
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
  expect(i18n.t('review.scope', { network: 'Sepolia', account: '계정 1' })).toBe('Sepolia 테스트넷 · 계정 1에서')
  expect(i18n.t('review.lookalike.title', { count: 2 })).toBe('최근 주소와 2묶음이 달라요')
  expect(i18n.t('send.recipientLabel')).toBe('받는 주소')
  expect(i18n.t('review.recipient')).toBe('받는 주소')
  expect(i18n.t('review.fee')).toBe('예상 네트워크 수수료')
  expect(i18n.t('review.feeCap')).toBe('최대 네트워크 수수료')
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
  expect(i18n.t('restore.helper')).toBe('12단어나 24단어를 띄어쓰기로 구분해 입력하세요.')
  expect(i18n.t('restore.unknownWord', { word: 'abcd' })).toBe("'abcd'는 복구 구문 단어가 아니에요.")
  expect(i18n.t('restore.wrongCount', { count: 13 })).toBe('13단어를 입력했어요. 12단어나 24단어여야 해요.')
  expect(i18n.t('restore.done.title')).toBe('복구 완료')
  expect(i18n.t('restore.open')).toBe('지갑 열기')
})

it('has the C2b send result, detail and test-data copy', () => {
  expect(i18n.t('send.authPrompt')).toBe('보내려면 인증하세요')
  expect(i18n.t('send.pendingBlock.title')).toBe('진행 중인 보내기가 있어요')
  expect(i18n.t('testData.title')).toBe('테스트 데이터예요')
  expect(i18n.t('notBroadcast.title')).toBe('네트워크로 보내지 않았어요 (테스트)')
  expect(i18n.t('result.title')).toBe('네트워크 처리를 기다리는 중이에요')
  expect(i18n.t('result.unknownBody')).toBe('다시 보내지 말고 상태를 확인해 주세요.')
  expect(i18n.t('detail.auto')).toBe('자동으로 다시 확인해요.')
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
  expect(i18n.t('updateRequired.cta')).toBe('스토어에서 업데이트')
})
