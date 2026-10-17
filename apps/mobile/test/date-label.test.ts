import { expect, it } from 'vitest'
import { dateLabel } from '../src/shared/lib/time'

it('titles a history day with the weekday (B/Date header)', () => {
  expect(dateLabel(new Date(2026, 9, 16, 9, 41).getTime())).toBe('10월 16일 (금)')
  expect(dateLabel(new Date(2026, 9, 12, 8, 30).getTime())).toBe('10월 12일 (월)')
  expect(dateLabel(new Date(2026, 9, 11, 7, 55).getTime())).toBe('10월 11일 (일)')
})
