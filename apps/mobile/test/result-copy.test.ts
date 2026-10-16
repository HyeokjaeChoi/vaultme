import { expect, it } from 'vitest'
import { resultCopy } from '../src/features/send/model/txView'

it('says "보내는 중이에요" for Pending and Included, "보냈어요" only for Confirmed', () => {
  expect(resultCopy('Pending').title).toBe('result.sending')
  expect(resultCopy('Included').title).toBe('result.sending')
  expect(resultCopy('Confirmed').title).toBe('result.sent')
  for (const s of ['Pending', 'Included', 'Failed', 'Unknown', 'Replaced'] as const) expect(resultCopy(s).title).not.toBe('result.sent')
})
it('warns not to send again while a send may still go through', () => {
  expect(resultCopy('Pending').warn).toBe('result.body')
  expect(resultCopy('Included').warn).toBe('result.includedWarn')
  expect(resultCopy('Unknown').warn).toBe('result.unknownBody')
  expect(resultCopy('Confirmed').warn).toBeNull()
})
