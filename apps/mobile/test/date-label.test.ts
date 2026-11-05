import { expect, it } from 'vitest'
import { dateLabel } from '../src/shared/lib/time'

it('titles a history day with the weekday (B/Date header)', () => {
  expect(dateLabel(new Date(2026, 9, 16, 9, 41).getTime())).toBe('10월 16일 (금)')
  expect(dateLabel(new Date(2026, 9, 12, 8, 30).getTime())).toBe('10월 12일 (월)')
  expect(dateLabel(new Date(2026, 9, 11, 7, 55).getTime())).toBe('10월 11일 (일)')
})

it('follows the app language (ADR-0037)', async () => {
  const { i18n } = await import('@vaultme/i18n')
  const { formatUpdated, monthDay } = await import('../src/shared/lib/time')
  const { chainName } = await import('../src/shared/lib/qrAddress')
  await i18n.changeLanguage('en')
  try {
    expect(dateLabel(new Date(2026, 9, 16, 9, 41).getTime())).toBe('Fri, Oct 16')
    expect(monthDay(new Date(2026, 9, 12).getTime())).toBe('Oct 12')
    expect(formatUpdated(new Date(2026, 9, 13, 9, 12).getTime(), new Date(2026, 9, 14).getTime())).toBe('Oct 13 09:12')
    expect(chainName(1)).toBe('Ethereum Mainnet')
    expect(chainName(8453)).toBe('Base')
  } finally {
    await i18n.changeLanguage('ko')
  }
  expect(monthDay(new Date(2026, 9, 12).getTime())).toBe('10월 12일')
  expect(chainName(1)).toBe('Ethereum 메인넷')
})
