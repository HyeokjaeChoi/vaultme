import { describe, expect, it } from 'vitest'
import { clock, dayHeader, etherscanAddress, FAUCET_URL, relativeTime, signed } from '../app/shared/lib/history'

// Local time: the formatters follow the viewer's time zone, so the tests build their instants in it.
const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime()
const NOW = at(2026, 10, 25, 12, 0)

describe('relativeTime (Figma time column: 3분 전, 12분 전, 어제, 10월 11일)', () => {
  it('ko: minutes, hours, yesterday, then the date', () => {
    expect(relativeTime(NOW - 3 * 60_000, NOW, 'ko')).toBe('3분 전')
    expect(relativeTime(NOW - 5 * 3_600_000, NOW, 'ko')).toBe('5시간 전')
    expect(relativeTime(at(2026, 10, 24, 23, 59), NOW, 'ko')).toBe('어제')
    expect(relativeTime(at(2026, 10, 11, 9), NOW, 'ko')).toBe('10월 11일')
  })
  it('en', () => {
    expect(relativeTime(NOW - 3 * 60_000, NOW, 'en')).toBe('3 minutes ago')
    expect(relativeTime(at(2026, 10, 24, 23, 59), NOW, 'en')).toBe('yesterday')
    expect(relativeTime(at(2026, 10, 11, 9), NOW, 'en')).toBe('Oct 11')
  })
  it('a row from before this year shows the year; a clock a little ahead of the server shows now, not the future', () => {
    expect(relativeTime(at(2025, 12, 30, 9), NOW, 'ko')).toBe('2025년 12월 30일')
    expect(relativeTime(NOW + 30_000, NOW, 'ko')).toBe('지금')
  })
})

describe('card parts (Figma Activity row)', () => {
  it('date header and clock', () => {
    expect(dayHeader(at(2026, 10, 25, 9, 12), 'ko')).toBe('10월 25일 (일)')
    expect(clock(at(2026, 10, 25, 9, 12), 'ko')).toBe('09:12')
  })
})

describe('signed (Figma amount: +0.05 ETH, −0.02 ETH)', () => {
  it('+ for received, a real minus sign for sent', () => {
    expect(signed({ kind: 'receive', amount: '0.05', asset: 'ETH' })).toBe('+0.05 ETH')
    expect(signed({ kind: 'send', amount: '0.02', asset: 'ETH' })).toBe('−0.02 ETH')
  })
  it('a 0 amount has no sign', () => {
    expect(signed({ kind: 'send', amount: '0', asset: 'USDC' })).toBe('0 USDC')
  })
})

describe('links', () => {
  it('the faucet is the one mobile opens; Etherscan is the Sepolia site', () => {
    expect(FAUCET_URL).toBe('https://faucet.quicknode.com/ethereum/sepolia')
    expect(etherscanAddress('0xabc')).toBe('https://sepolia.etherscan.io/address/0xabc')
  })
})
