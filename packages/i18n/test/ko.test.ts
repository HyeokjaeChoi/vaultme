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
