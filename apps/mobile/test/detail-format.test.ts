import { expect, it } from 'vitest'
import { shortHash } from '../src/shared/lib/address'
import { dateParts } from '../src/shared/lib/time'

const HASH = '0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90'

it('shortens a tx hash to the first 6 and last 4 characters', () => {
  expect(shortHash(HASH)).toBe('0xa1b2…8f90')
})

it('splits a time into the parts of "2026년 10월 16일 오전 9:41" (12-hour clock)', () => {
  expect(dateParts(new Date(2026, 9, 16, 9, 41).getTime())).toEqual({
    year: 2026,
    month: 10,
    day: 16,
    pm: false,
    hour: 9,
    minute: '41',
  })
  expect(dateParts(new Date(2026, 9, 16, 0, 5).getTime())).toMatchObject({ pm: false, hour: 12, minute: '05' })
  expect(dateParts(new Date(2026, 9, 16, 12, 0).getTime())).toMatchObject({ pm: true, hour: 12, minute: '00' })
  expect(dateParts(new Date(2026, 9, 16, 21, 30).getTime())).toMatchObject({ pm: true, hour: 9, minute: '30' })
})
