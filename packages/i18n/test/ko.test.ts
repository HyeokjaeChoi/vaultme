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
