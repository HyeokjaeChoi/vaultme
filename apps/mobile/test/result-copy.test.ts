import { expect, it } from 'vitest'
import { resultCopy } from '../src/features/send/model/txView'

it('says "보내는 중이에요" for Pending and Included, "보냈어요" only for Confirmed', () => {
  expect(resultCopy('Pending').title).toBe('result.sending')
  expect(resultCopy('Included').title).toBe('result.sending')
  expect(resultCopy('Confirmed').title).toBe('result.sent')
  for (const s of ['Pending', 'Included', 'Failed', 'Unknown', 'Replaced'] as const)
    expect(resultCopy(s).title).not.toBe('result.sent')
})
it('warns not to send again while a send may still go through', () => {
  expect(resultCopy('Pending').warn).toBe('result.sendAgainWarn')
  expect(resultCopy('Included').warn).toBe('result.sendAgainWarn')
  expect(resultCopy('Unknown').body).toBe('result.unknownBody')
  expect(resultCopy('Confirmed').warn).toBeNull()
})

import { rowTitleKey } from '../src/features/send/model/txView'
it('names a row by direction and progress (S40)', () => {
  expect(rowTitleKey('send', 'activity.pending')).toBe('activity.row.sending')
  expect(rowTitleKey('send', 'activity.included')).toBe('activity.row.sending')
  expect(rowTitleKey('send', 'activity.confirmed')).toBe('activity.row.sent')
  expect(rowTitleKey('receive', 'activity.confirmed')).toBe('activity.row.received')
  expect(rowTitleKey('send', 'activity.failed')).toBe('activity.row.failed')
  expect(rowTitleKey('send', 'activity.unknown')).toBe('activity.row.unknown')
  expect(rowTitleKey('send', 'activity.replaced')).toBe('activity.row.replaced')
})
