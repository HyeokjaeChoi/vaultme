import { toUnits } from '@vaultme/wallet-core'
import { describe, expect, it } from 'vitest'
import { feeShortBy, listBalance, parseSendAsset, sendLimits } from '../src/features/send/model/limits'

const CAP = 227_500_000_000_000n // 0.0002275 ETH: the fake USDC fee cap

describe('sendLimits', () => {
  it('ETH: sendable is balance minus the fee cap, chips are shares of it', () => {
    const l = sendLimits('ETH', {
      balance: toUnits('1', 'ETH'),
      nativeBalance: toUnits('1', 'ETH'),
      feeCap: 73_500_000_000_000n,
    })
    expect(l.sendable).toBe('0.9999265')
    expect(l.feeShort).toBe(false)
    expect(l.chips.map((c) => c.pct)).toEqual([25, 50, 100])
    expect(l.chips[2]?.value).toBe('0.999926') // floored to 6 digits
  })
  it('USDC with enough ETH: sendable is the whole balance, chips floor to 2 decimals', () => {
    const l = sendLimits('USDC', {
      balance: toUnits('25.5', 'USDC'),
      nativeBalance: toUnits('0.01', 'ETH'),
      feeCap: CAP,
    })
    expect(l).toMatchObject({ sendable: '25.5', feeShort: false })
    expect(l.chips.map((c) => c.value)).toEqual(['6.37', '12.75', '25.5'])
  })
  it('USDC with too little ETH: chips are all off, the keypad max stays the balance', () => {
    const l = sendLimits('USDC', { balance: toUnits('25.5', 'USDC'), nativeBalance: 109_500_000_000_000n, feeCap: CAP })
    expect(l).toMatchObject({ sendable: '25.5', feeShort: true })
    expect(l.chips.every((c) => c.raw === 0n)).toBe(true)
  })
  it('no snapshot yet: nothing is known and every chip is off', () => {
    const l = sendLimits('USDC', null)
    expect(l).toMatchObject({ sendable: null, feeShort: false })
    expect(l.chips.every((c) => c.raw === 0n)).toBe(true)
  })
})

it('feeShortBy reads the wallet-core warning', () => {
  expect(
    feeShortBy([
      { kind: 'recipientRisk', risk: 'first' },
      { kind: 'nativeFeeShortfall', shortBy: 118_000_000_000_000n },
    ]),
  ).toBe(118_000_000_000_000n)
  expect(feeShortBy([])).toBeNull()
})
it('parseSendAsset: only USDC selects USDC', () => {
  expect(['USDC', 'ETH', 'usdc', undefined, null, ''].map(parseSendAsset)).toEqual([
    'USDC',
    'ETH',
    'ETH',
    'ETH',
    'ETH',
    'ETH',
  ])
})
it('listBalance: 2 decimals, floored, padded, <0.01 for dust', () => {
  expect(listBalance(toUnits('1.284732', 'ETH'), 'ETH')).toBe('1.28')
  expect(listBalance(toUnits('25.5', 'USDC'), 'USDC')).toBe('25.50')
  expect(listBalance(toUnits('0.999999', 'USDC'), 'USDC')).toBe('0.99')
  expect(listBalance(109_500_000_000_000n, 'ETH')).toBe('<0.01')
  expect(listBalance(0n, 'USDC')).toBe('0.00')
})
